package com.insp17.ytms.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.media.MediaHttpUploader;
import com.google.api.client.googleapis.media.MediaHttpUploaderProgressListener;
import com.google.api.client.http.InputStreamContent;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.*;
import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import com.google.cloud.secretmanager.v1.SecretVersionName;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.insp17.ytms.dtos.ChannelTokenStatus;
import com.insp17.ytms.dtos.VideoMetadataResponseDTO;
import com.insp17.ytms.entity.Revision;
import com.insp17.ytms.entity.VideoTask;
import com.insp17.ytms.entity.YouTubeChannel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
public class YouTubeService {

    @Value("${gcp.project-id}")
    private String projectId;

    @Value("${gcp.client-secret-key:client_data}")
    private String clientSecretKey;

    @Autowired
    private SecretManagerServiceClient secretManagerServiceClient;

    @Autowired
    private VideoMetadataService videoMetadataService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private YouTubeAccountService youTubeAccountService;

    // YouTube API constraints
    private static final long MAX_FILE_SIZE = 256L * 1024 * 1024 * 1024; // 256GB
    private static final int MAX_TITLE_LENGTH = 100;
    private static final int MAX_DESCRIPTION_LENGTH = 5000;
    private static final int MAX_TAGS_COUNT = 500;
    private static final List<String> SUPPORTED_FORMATS = Arrays.asList(
            ".mov", ".mpeg4", ".mp4", ".avi", ".wmv", ".mpegps", ".flv", ".3gpp", ".webm"
    );
    private static final List<String> VALID_PRIVACY_STATUSES = Arrays.asList("private", "public", "unlisted");

    /**
     * Creates YouTube service with automatic token refresh
     * Now uses the account email to fetch the correct refresh token
     */
    private YouTube getYouTubeService(YouTubeChannel channel) throws IOException, GeneralSecurityException {
        final JsonObject clientDetails = fetchClientDetails();
        final JsonObject secrets = clientDetails.getAsJsonObject("web");

        final String clientId = secrets.get("client_id").getAsString();
        final String clientSecret = secrets.get("client_secret").getAsString();

        // Get refresh token for the specific YouTube account
        final String refreshToken = youTubeAccountService.getRefreshToken(channel.getYoutubeChannelOwnerEmail());

        // Create credential with automatic refresh capability
        Credential credential = new GoogleCredential.Builder()
                .setTransport(GoogleNetHttpTransport.newTrustedTransport())
                .setJsonFactory(GsonFactory.getDefaultInstance())
                .setClientSecrets(clientId, clientSecret)
                .build()
                .setRefreshToken(refreshToken);

        // Ensure we have a valid access token
        ensureValidAccessToken(credential);

        return new YouTube.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                credential)
                .setApplicationName("ytms-app")
                .build();
    }

    /**
     * Upload video to specific channel
     * The channel parameter now determines which YouTube account to use
     */
    public Video uploadVideo(VideoTask task, YouTubeChannel channel) throws IOException, GeneralSecurityException {
        log.info("Starting video upload for task: {} to channel: {} (owner: {})",
                task.getId(), channel.getChannelName(), channel.getYoutubeChannelOwnerEmail());

        // Validation
        if (channel.getYoutubeChannelOwnerEmail() == null) {
            throw new IOException("YouTube channel owner email is not set");
        }

        // Check if the account is connected
        if (!youTubeAccountService.isAccountConnected(channel.getYoutubeChannelOwnerEmail())) {
            throw new IOException("YouTube account " + channel.getYoutubeChannelOwnerEmail() +
                    " is not connected. Please connect the account first.");
        }

        // Rest of your upload logic remains the same...
        // Get latest revision
        Revision latestRevision = task.getRevisions().stream()
                .max((r1, r2) -> r1.getRevisionNumber().compareTo(r2.getRevisionNumber()))
                .orElseThrow(() -> new IOException("No revisions found for this task"));

        // Get and validate metadata
        VideoMetadataResponseDTO metadata = videoMetadataService.getVideoMetadata(task.getId());
        if (metadata == null) {
            throw new IOException("Video metadata is required for YouTube upload");
        }
        validateMetadata(metadata);

        // Download and validate video file
        log.info("Downloading video file from: {}", latestRevision.getEditedVideoUrl());
        byte[] fileContent = fileStorageService.downloadFile(latestRevision.getEditedVideoUrl());
        validateVideoFile(fileContent, latestRevision.getEditedVideoUrl());

        // Create video object
        Video videoObject = createVideoObject(metadata);

        // Upload video
        try (InputStream inputStream = new ByteArrayInputStream(fileContent)) {
            InputStreamContent mediaContent = new InputStreamContent("video/*", inputStream);
            mediaContent.setLength(fileContent.length);

            YouTube youtubeService = getYouTubeService(channel);

            YouTube.Videos.Insert videoInsert = youtubeService.videos()
                    .insert(Collections.singletonList("snippet,status"), videoObject, mediaContent);

            // Configure upload
            MediaHttpUploader uploader = videoInsert.getMediaHttpUploader();
            uploader.setDirectUploadEnabled(false);
            uploader.setChunkSize(MediaHttpUploader.MINIMUM_CHUNK_SIZE);
            uploader.setProgressListener(createProgressListener(metadata.getTitle()));

            log.info("Uploading '{}' to channel: {} (account: {})",
                    metadata.getTitle(), channel.getChannelName(), channel.getYoutubeChannelOwnerEmail());

            Video uploadedVideo = videoInsert.execute();

            log.info("Successfully uploaded video - ID: {}, Title: {}, Channel: {}, Status: {}",
                    uploadedVideo.getId(),
                    uploadedVideo.getSnippet().getTitle(),
                    channel.getChannelName(),
                    uploadedVideo.getStatus().getPrivacyStatus());

            return uploadedVideo;

        } catch (Exception e) {
            log.error("Failed to upload video '{}' to channel '{}': {}",
                    metadata.getTitle(), channel.getChannelName(), e.getMessage(), e);
            throw new IOException("Video upload failed: " + e.getMessage(), e);
        }
    }

    /**
     * Ensures the access token is valid, refreshing if necessary
     */
    private void ensureValidAccessToken(Credential credential) throws IOException {
        if (credential.getAccessToken() == null ||
                (credential.getExpiresInSeconds() != null && credential.getExpiresInSeconds() <= 300)) {

            log.info("Access token is null or expiring soon, refreshing...");
            boolean refreshed = credential.refreshToken();

            if (!refreshed) {
                throw new IOException("Failed to refresh access token. Refresh token may be invalid or expired.");
            }

            log.info("Access token refreshed successfully. Expires in: {} seconds",
                    credential.getExpiresInSeconds());
        }
    }

    /**
     * Fetches client secrets from Secret Manager
     */
    private JsonObject fetchClientDetails() {
        try {
            SecretVersionName secretVersionName = SecretVersionName.of(projectId, clientSecretKey, "latest");
            String payload = secretManagerServiceClient.accessSecretVersion(secretVersionName)
                    .getPayload().getData().toStringUtf8();
            return JsonParser.parseString(payload).getAsJsonObject();
        } catch (Exception e) {
            log.error("Failed to fetch client details from Secret Manager", e);
            throw new RuntimeException("Unable to retrieve client credentials", e);
        }
    }

    /**
     * UPDATED: Fetches refresh token for specific channel using channel's refreshTokenKey
     */
    private String fetchRefreshToken(YouTubeChannel channel) {
        try {
            // Use channel-specific refresh token key
            String refreshTokenKey = channel.getRefreshTokenKey();
            if (refreshTokenKey == null) {
                // Fallback to default token key
                refreshTokenKey = "YT_REFRESH_TOKEN";
                log.warn("Channel {} has no specific refresh token key, using default", channel.getChannelName());
            }

            SecretVersionName secretVersionName = SecretVersionName.of(projectId, refreshTokenKey, "latest");
            String refreshToken = secretManagerServiceClient.accessSecretVersion(secretVersionName)
                    .getPayload().getData().toStringUtf8();

            log.info("Retrieved refresh token for channel: {} using key: {}",
                    channel.getChannelName(), refreshTokenKey);
            return refreshToken;
        } catch (Exception e) {
            log.error("Failed to fetch refresh token for channel: {} with key: {}",
                    channel.getChannelName(), channel.getRefreshTokenKey(), e);
            throw new RuntimeException("Unable to retrieve refresh token for channel: " + channel.getChannelName(), e);
        }
    }

    /**
     * Validates video file constraints
     */
    private void validateVideoFile(byte[] fileContent, String fileName) throws IOException {
        if (fileContent.length == 0) {
            throw new IOException("Video file is empty");
        }

        if (fileContent.length > MAX_FILE_SIZE) {
            throw new IOException(String.format(
                    "File size exceeds YouTube's 256GB limit. Current size: %.2fGB",
                    fileContent.length / (1024.0 * 1024.0 * 1024.0)
            ));
        }

        if (fileName != null && fileName.contains(".")) {
            String extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
            if (!SUPPORTED_FORMATS.contains(extension)) {
                throw new IOException(String.format(
                        "Unsupported video format: %s. Supported formats: %s",
                        extension, String.join(", ", SUPPORTED_FORMATS)
                ));
            }
        }

        log.info("Video file validation passed. Size: {:.2f}MB", fileContent.length / (1024.0 * 1024.0));
    }

    /**
     * Validates video metadata constraints
     */
    private void validateMetadata(VideoMetadataResponseDTO metadata) throws IOException {
        if (metadata.getTitle() == null || metadata.getTitle().trim().isEmpty()) {
            throw new IOException("Video title is required");
        }

        if (metadata.getTitle().length() > MAX_TITLE_LENGTH) {
            throw new IOException(String.format(
                    "Video title exceeds %d character limit. Current length: %d",
                    MAX_TITLE_LENGTH, metadata.getTitle().length()
            ));
        }

        if (metadata.getDescription() != null && metadata.getDescription().length() > MAX_DESCRIPTION_LENGTH) {
            throw new IOException(String.format(
                    "Video description exceeds %d character limit. Current length: %d",
                    MAX_DESCRIPTION_LENGTH, metadata.getDescription().length()
            ));
        }

        if (metadata.getPrivacyStatus() == null ||
                !VALID_PRIVACY_STATUSES.contains(metadata.getPrivacyStatus().toLowerCase())) {
            throw new IOException(String.format(
                    "Invalid privacy status: %s. Valid options: %s",
                    metadata.getPrivacyStatus(), String.join(", ", VALID_PRIVACY_STATUSES)
            ));
        }

        if (metadata.getTags() != null && metadata.getTags().size() > MAX_TAGS_COUNT) {
            throw new IOException(String.format(
                    "Too many tags. Maximum allowed: %d. Current count: %d",
                    MAX_TAGS_COUNT, metadata.getTags().size()
            ));
        }

        log.info("Video metadata validation passed for: {}", metadata.getTitle());
    }

    /**
     * Creates upload progress listener for monitoring
     */
    private MediaHttpUploaderProgressListener createProgressListener(String videoTitle) {
        return uploader -> {
            switch (uploader.getUploadState()) {
                case INITIATION_STARTED:
                    log.info("Starting upload for: {}", videoTitle);
                    break;
                case INITIATION_COMPLETE:
                    log.info("Upload initialization complete for: {}", videoTitle);
                    break;
                case MEDIA_IN_PROGRESS:
                    double progress = uploader.getProgress() * 100;
                    long uploadedBytes = uploader.getNumBytesUploaded();
                    log.info("Upload progress for '{}': {:.1f}% ({} bytes)",
                            videoTitle, progress, uploadedBytes);
                    break;
                case MEDIA_COMPLETE:
                    log.info("Upload completed for: {}", videoTitle);
                    break;
                case NOT_STARTED:
                    log.info("Upload not started for: {}", videoTitle);
                    break;
            }
        };
    }

//    /**
//     * Main video upload method with enhanced channel support
//     */
//    public Video uploadVideo(VideoTask task, YouTubeChannel channel) throws IOException, GeneralSecurityException {
//
//        log.info("Starting video upload process for task: {} to channel: {}",
//                task.getId(), channel.getChannelName());
//
//        // Validation
//        if (channel.getYoutubeChannelOwnerEmail() == null) {
//            throw new IOException("YouTube channel owner email is not set");
//        }
//
//        // Verify refresh token exists for this channel
//        if (channel.getRefreshTokenKey() == null) {
//            throw new IOException("No refresh token key configured for channel: " + channel.getChannelName() +
//                    ". Please run OAuth setup for this channel first.");
//        }
//
//        // Get latest revision
//        Revision latestRevision = task.getRevisions().stream()
//                .max((r1, r2) -> r1.getRevisionNumber().compareTo(r2.getRevisionNumber()))
//                .orElseThrow(() -> new IOException("No revisions found for this task"));
//
//        // Get and validate metadata
//        VideoMetadataResponseDTO metadata = videoMetadataService.getVideoMetadata(task.getId());
//        if (metadata == null) {
//            throw new IOException("Video metadata is required for YouTube upload");
//        }
//        validateMetadata(metadata);
//
//        // Download and validate video file
//        log.info("Downloading video file from: {}", latestRevision.getEditedVideoUrl());
//        byte[] fileContent = fileStorageService.downloadFile(latestRevision.getEditedVideoUrl());
//        validateVideoFile(fileContent, latestRevision.getEditedVideoUrl());
//
//        // Create video object
//        Video videoObject = createVideoObject(metadata);
//
//        // Upload video
//        try (InputStream inputStream = new ByteArrayInputStream(fileContent)) {
//            InputStreamContent mediaContent = new InputStreamContent("video/*", inputStream);
//            mediaContent.setLength(fileContent.length);
//
//            YouTube youtubeService = getYouTubeService(channel);
//
//            YouTube.Videos.Insert videoInsert = youtubeService.videos()
//                    .insert(Collections.singletonList("snippet,status"), videoObject, mediaContent);
//
//            // Configure upload
//            MediaHttpUploader uploader = videoInsert.getMediaHttpUploader();
//            uploader.setDirectUploadEnabled(false);
//            uploader.setChunkSize(MediaHttpUploader.MINIMUM_CHUNK_SIZE);
//            uploader.setProgressListener(createProgressListener(metadata.getTitle()));
//
//            log.info("Uploading '{}' to channel: {} ({})",
//                    metadata.getTitle(), channel.getChannelName(), channel.getYoutubeChannelOwnerEmail());
//
//            Video uploadedVideo = videoInsert.execute();
//
//            log.info("Successfully uploaded video - ID: {}, Title: {}, Channel: {}, Status: {}",
//                    uploadedVideo.getId(),
//                    uploadedVideo.getSnippet().getTitle(),
//                    channel.getChannelName(),
//                    uploadedVideo.getStatus().getPrivacyStatus());
//
//            return uploadedVideo;
//
//        } catch (Exception e) {
//            log.error("Failed to upload video '{}' to channel '{}': {}",
//                    metadata.getTitle(), channel.getChannelName(), e.getMessage(), e);
//            throw new IOException("Video upload failed: " + e.getMessage(), e);
//        }
//    }

    /**
     * Creates Video object with metadata
     */
    private Video createVideoObject(VideoMetadataResponseDTO metadata) {
        VideoSnippet snippet = new VideoSnippet();
        snippet.setTitle(metadata.getTitle());
        snippet.setDescription(metadata.getDescription());

        if (metadata.getTags() != null && !metadata.getTags().isEmpty()) {
            snippet.setTags(new ArrayList<>(metadata.getTags()));
        }
        Thumbnail thumbnail = new Thumbnail();
        thumbnail.setUrl(metadata.getThumbnailUrl());
        ThumbnailDetails thumbnailDetails = new ThumbnailDetails();
        thumbnailDetails.setDefault(thumbnail);
        snippet.setThumbnails(thumbnailDetails);

        VideoStatus status = new VideoStatus();
        status.setPrivacyStatus(metadata.getPrivacyStatus());
        status.setMadeForKids(metadata.getMadeForKids());

        Video videoObject = new Video();
        videoObject.setSnippet(snippet);
        videoObject.setStatus(status);

        return videoObject;
    }

    /**
     * Get all channels for authenticated user with their current token status
     */
    public List<ChannelTokenStatus> getChannelTokenStatus() {
        // This would be called by an admin to see which channels have tokens
        // Implementation depends on your channel repository
        return Collections.emptyList(); // Placeholder
    }

    /**
     * Test if a channel's refresh token is working
     */
    public boolean testChannelConnection(YouTubeChannel channel) {
        try {
            YouTube youtubeService = getYouTubeService(channel);

            // Simple API call to test connectivity
            YouTube.Channels.List request = youtubeService.channels()
                    .list(Collections.singletonList("snippet"));
            request.setMine(true);
            request.setMaxResults(1L);

            request.execute();

            log.info("Successfully tested connection for channel: {}", channel.getChannelName());
            return true;

        } catch (Exception e) {
            log.error("Failed to connect to channel: {} - Error: {}",
                    channel.getChannelName(), e.getMessage());
            return false;
        }
    }

    /**
     * Get user's YouTube channels (requires valid token)
     */
    public List<com.google.api.services.youtube.model.Channel> getUserYouTubeChannels(YouTubeChannel channel)
            throws IOException, GeneralSecurityException {

        YouTube youtubeService = getYouTubeService(channel);

        YouTube.Channels.List request = youtubeService.channels()
                .list(Collections.singletonList("snippet,contentDetails,statistics"));
        request.setMine(true);
        request.setMaxResults(50L);

        return request.execute().getItems();
    }

    /**
     * Update existing video metadata on YouTube
     */
    public Video updateVideoMetadata(String videoId, VideoMetadataResponseDTO metadata, YouTubeChannel channel)
            throws IOException, GeneralSecurityException {

        validateMetadata(metadata);

        YouTube youtubeService = getYouTubeService(channel);

        // Get existing video
        YouTube.Videos.List listRequest = youtubeService.videos()
                .list(Collections.singletonList("snippet,status"));
        listRequest.setId(Collections.singletonList(videoId));

        List<Video> videos = listRequest.execute().getItems();
        if (videos.isEmpty()) {
            throw new IOException("Video not found: " + videoId);
        }

        Video existingVideo = videos.get(0);

        // Update metadata
        VideoSnippet snippet = existingVideo.getSnippet();
        snippet.setTitle(metadata.getTitle());
        snippet.setDescription(metadata.getDescription());

        if (metadata.getTags() != null && !metadata.getTags().isEmpty()) {
            snippet.setTags(new ArrayList<>(metadata.getTags()));
        }

        VideoStatus status = existingVideo.getStatus();
        status.setPrivacyStatus(metadata.getPrivacyStatus());
        status.setMadeForKids(metadata.getMadeForKids());

        // Execute update
        YouTube.Videos.Update updateRequest = youtubeService.videos()
                .update(Collections.singletonList("snippet,status"), existingVideo);

        Video updatedVideo = updateRequest.execute();
        log.info("Successfully updated video metadata for: {}", updatedVideo.getId());

        return updatedVideo;
    }

    /**
     * Delete a video from YouTube
     */
    public void deleteVideo(String videoId, YouTubeChannel channel)
            throws IOException, GeneralSecurityException {

        YouTube youtubeService = getYouTubeService(channel);

        YouTube.Videos.Delete deleteRequest = youtubeService.videos().delete(videoId);
        deleteRequest.execute();

        log.info("Successfully deleted video: {} from channel: {}", videoId, channel.getChannelName());
    }

    /**
     * Get video details from YouTube
     */
    public Video getVideoDetails(String videoId, YouTubeChannel channel)
            throws IOException, GeneralSecurityException {

        YouTube youtubeService = getYouTubeService(channel);

        YouTube.Videos.List listRequest = youtubeService.videos()
                .list(Collections.singletonList("snippet,contentDetails,statistics,status"));
        listRequest.setId(Collections.singletonList(videoId));

        List<Video> videos = listRequest.execute().getItems();
        if (videos.isEmpty()) {
            throw new IOException("Video not found: " + videoId);
        }

        return videos.get(0);
    }

}