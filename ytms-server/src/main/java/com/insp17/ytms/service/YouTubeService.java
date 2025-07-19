package com.insp17.ytms.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.media.MediaHttpUploader;
import com.google.api.client.googleapis.media.MediaHttpUploaderProgressListener;
import com.google.api.client.http.InputStreamContent;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.YouTubeScopes;
import com.google.api.services.youtube.model.Video;
import com.google.api.services.youtube.model.VideoSnippet;
import com.google.api.services.youtube.model.VideoStatus;
import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import com.google.cloud.secretmanager.v1.SecretVersionName;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
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
import java.io.StringReader;
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
     */
    private YouTube getYouTubeService(YouTubeChannel channel) throws IOException, GeneralSecurityException {
        final JsonObject clientDetails = fetchClientDetails();
        final JsonObject secrets = clientDetails.getAsJsonObject("web");

        final String clientId = secrets.get("client_id").getAsString();
        final String clientSecret = secrets.get("client_secret").getAsString();
        final String refreshToken = fetchRefreshToken(channel);

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
                .setApplicationName("Ytms-app")
                .build();
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
     * Fetches refresh token for specific channel
     * You can store different refresh tokens for different channels
     */
    private String fetchRefreshToken(YouTubeChannel channel) {
        try {
            // Use channel-specific refresh token key if available, otherwise use default
            String refreshTokenKey = "YT_REFRESH_TOKEN";

            SecretVersionName secretVersionName = SecretVersionName.of(projectId, refreshTokenKey, "latest");
            String refreshToken = secretManagerServiceClient.accessSecretVersion(secretVersionName)
                    .getPayload().getData().toStringUtf8();

            log.info("Retrieved refresh token for channel: {}", channel.getYoutubeChannelOwnerEmail());
            return refreshToken;
        } catch (Exception e) {
            log.error("Failed to fetch refresh token for channel: {}", channel.getYoutubeChannelOwnerEmail(), e);
            throw new RuntimeException("Unable to retrieve refresh token for channel", e);
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

    /**
     * Main video upload method
     */
    public Video uploadVideo(VideoTask task, YouTubeChannel channel) throws IOException, GeneralSecurityException {

        log.info("Starting video upload process for task: {}", task.getId());

        // Validation
        if (channel.getYoutubeChannelOwnerEmail() == null) {
            throw new IOException("YouTube channel owner email is not set");
        }

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

            log.info("Uploading '{}' to channel: {}", metadata.getTitle(), channel.getYoutubeChannelOwnerEmail());

            Video uploadedVideo = videoInsert.execute();

            log.info("Successfully uploaded video - ID: {}, Title: {}, Status: {}",
                    uploadedVideo.getId(),
                    uploadedVideo.getSnippet().getTitle(),
                    uploadedVideo.getStatus().getPrivacyStatus());

            return uploadedVideo;

        } catch (Exception e) {
            log.error("Failed to upload video '{}': {}", metadata.getTitle(), e.getMessage(), e);
            throw new IOException("Video upload failed: " + e.getMessage(), e);
        }
    }

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

        VideoStatus status = new VideoStatus();
        status.setPrivacyStatus(metadata.getPrivacyStatus());
        status.setMadeForKids(metadata.getMadeForKids());

        Video videoObject = new Video();
        videoObject.setSnippet(snippet);
        videoObject.setStatus(status);

        return videoObject;
    }

    /**
     * Updates existing video metadata
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
     * Deletes a video from YouTube
     */
    public void deleteVideo(String videoId, YouTubeChannel channel)
            throws IOException, GeneralSecurityException {

        YouTube youtubeService = getYouTubeService(channel);

        YouTube.Videos.Delete deleteRequest = youtubeService.videos().delete(videoId);
        deleteRequest.execute();

        log.info("Successfully deleted video: {}", videoId);
    }

    /**
     * Gets video details from YouTube
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

    /**
     * Generates authorization URL for getting refresh token
     * Use this for initial setup or when refresh token expires
     */
    public String generateAuthorizationUrl(String redirectUri) throws IOException, GeneralSecurityException {
        final JsonObject clientDetails = fetchClientDetails();

        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(
                GsonFactory.getDefaultInstance(),
                new StringReader(clientDetails.toString())
        );

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                clientSecrets,
                Collections.singletonList(YouTubeScopes.YOUTUBE))
                .setAccessType("offline")
                .setApprovalPrompt("force") // Force to get refresh token
                .build();

        String authUrl = flow.newAuthorizationUrl()
                .setRedirectUri(redirectUri)
                .build();

        log.info("Generated authorization URL for refresh token setup");
        return authUrl;
    }

    /**
     * Exchanges authorization code for refresh token
     * Use this after user authorizes through the URL from generateAuthorizationUrl
     */
    public String exchangeCodeForRefreshToken(String authorizationCode, String redirectUri)
            throws IOException, GeneralSecurityException {

        final JsonObject clientDetails = fetchClientDetails();

        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(
                GsonFactory.getDefaultInstance(),
                new StringReader(clientDetails.toString())
        );

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                clientSecrets,
                Collections.singletonList(YouTubeScopes.YOUTUBE))
                .setAccessType("offline")
                .build();

        GoogleTokenResponse tokenResponse = flow.newTokenRequest(authorizationCode)
                .setRedirectUri(redirectUri)
                .execute();

        String refreshToken = tokenResponse.getRefreshToken();

        if (refreshToken == null) {
            throw new IOException("No refresh token received. Make sure to set access_type=offline and approval_prompt=force");
        }

        log.info("Successfully exchanged authorization code for refresh token");
        return refreshToken;
    }

    /**
     * Health check method to verify API connectivity
     */
    public boolean isApiHealthy(YouTubeChannel channel) {
        try {
            YouTube youtubeService = getYouTubeService(channel);

            // Simple API call to verify connectivity
            YouTube.Channels.List request = youtubeService.channels()
                    .list(Collections.singletonList("snippet"));
            request.setMine(true);
            request.setMaxResults(1L);

            request.execute();

            log.info("YouTube API health check passed for channel: {}", channel.getYoutubeChannelOwnerEmail());
            return true;

        } catch (Exception e) {
            log.error("YouTube API health check failed for channel: {}",
                    channel.getYoutubeChannelOwnerEmail(), e);
            return false;
        }
    }
}