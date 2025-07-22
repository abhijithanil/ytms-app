package com.insp17.ytms.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.media.MediaHttpUploader;
import com.google.api.client.googleapis.media.MediaHttpUploaderProgressListener;
import com.google.api.client.http.InputStreamContent;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.ThumbnailSetResponse;
import com.google.api.services.youtube.model.Video;
import com.google.api.services.youtube.model.VideoSnippet;
import com.google.api.services.youtube.model.VideoStatus;
import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import com.google.cloud.secretmanager.v1.SecretVersionName;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.GeneralSecurityException;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class YouTubeService {

    // YouTube API constraints
    private static final long MAX_FILE_SIZE = 256L * 1024 * 1024 * 1024; // 256GB
    private static final int MAX_TITLE_LENGTH = 100;
    private static final int MAX_DESCRIPTION_LENGTH = 5000;
    private static final int MAX_TAGS_COUNT = 500;
    private static final long MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB
    private static final List<String> SUPPORTED_FORMATS = Arrays.asList(
            ".mov", ".mpeg4", ".mp4", ".avi", ".wmv", ".mpegps", ".flv", ".3gpp", ".webm"
    );
    private static final List<String> VALID_PRIVACY_STATUSES = Arrays.asList("private", "public", "unlisted");

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
    @Autowired
    private VideoTaskService videoTaskService;
    @Autowired
    private CommentService commentService;


    private final YouTubeService self;

    @Autowired
    public YouTubeService(@Lazy YouTubeService self) {
        this.self = self;
    }

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
    public void uploadVideo(VideoTask task, YouTubeChannel channel, UploadVideoRequest uploadVideoRequest, User user) throws IOException, GeneralSecurityException {
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

        // --- Call the async method via the injected self-proxy ---
        self.uploadVideoOperations(latestRevision, metadata, channel, task, uploadVideoRequest, user);
    }

    @Async("youtubeUploadExecutor")
    public void uploadVideoOperations(Revision latestRevision, VideoMetadataResponseDTO metadata, YouTubeChannel channel, VideoTask task, UploadVideoRequest uploadVideoRequest, User user) throws IOException {
        log.info("Downloading video file from: {}", latestRevision.getEditedVideoUrl());
        byte[] fileContent = fileStorageService.downloadFile(latestRevision.getEditedVideoUrl());
        validateVideoFile(fileContent, latestRevision.getEditedVideoUrl());

        // Create video object (WITHOUT thumbnail - we'll upload it separately)
        Video videoObject = createVideoObjectWithoutThumbnail(metadata);

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
            String videoId = uploadedVideo.getId();

            log.info("Successfully uploaded video - ID: {}, Title: {}, Channel: {}, Status: {}",
                    videoId,
                    uploadedVideo.getSnippet().getTitle(),
                    channel.getChannelName(),
                    uploadedVideo.getStatus().getPrivacyStatus());

            // UPLOAD THUMBNAIL SEPARATELY (if provided)
            if (metadata.getThumbnailUrl() != null && !metadata.getThumbnailUrl().trim().isEmpty()) {
                try {
                    uploadThumbnail(youtubeService, videoId, metadata.getThumbnailUrl());
                    log.info("Successfully uploaded custom thumbnail for video: {}", videoId);
                } catch (Exception thumbnailError) {
                    log.error("Failed to upload thumbnail for video {}: {}", videoId, thumbnailError.getMessage());
                    // Don't fail the entire upload if thumbnail fails
                }
            }

            // Update task with YouTube video ID and set status to UPLOADED
            videoTaskService.updateTaskStatus(task.getId(), TaskStatus.COMPLETED, user);

            String comment = MessageFormat.format("The video with title {0} has been uploaded successfully.\nYoutube Link: {1}",
                    uploadedVideo.getSnippet().getTitle(), "https://youtube.com/watch?v=" + uploadedVideo.getId());
            commentService.addComment(uploadVideoRequest.getVideoId(), comment, user);

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
     * Updated metadata validation to include thumbnail requirements
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

        // Validate thumbnail URL if provided
        if (metadata.getThumbnailUrl() != null && !metadata.getThumbnailUrl().trim().isEmpty()) {
            if (!isValidUrl(metadata.getThumbnailUrl())) {
                throw new IOException("Invalid thumbnail URL format: " + metadata.getThumbnailUrl());
            }
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
     * Creates Video object WITHOUT thumbnail (thumbnail uploaded separately)
     */
    private Video createVideoObjectWithoutThumbnail(VideoMetadataResponseDTO metadata) throws IOException {
        VideoSnippet snippet = new VideoSnippet();
        snippet.setTitle(metadata.getTitle());
        snippet.setDescription(formatDescriptionWithChapters(metadata));

        if (metadata.getTags() != null && !metadata.getTags().isEmpty()) {
            snippet.setTags(new ArrayList<>(metadata.getTags()));
        }

        // DON'T set thumbnails here - YouTube will reject it

        VideoStatus status = new VideoStatus();
        status.setPrivacyStatus(metadata.getPrivacyStatus());
        status.setMadeForKids(metadata.getMadeForKids());

        Video videoObject = new Video();
        videoObject.setSnippet(snippet);
        videoObject.setStatus(status);

        return videoObject;
    }

    /**
     * Downloads image data from a public URL
     *
     * @param url The public URL to download from
     * @return byte array of the downloaded image
     * @throws IOException if download fails
     */
    private byte[] downloadFromPublicUrl(String url) throws IOException {
        log.debug("Downloading thumbnail from public URL: {}", url);

        try {
            // Create URL connection with proper configuration
            URL thumbnailUrl = new URL(url);
            HttpURLConnection connection = (HttpURLConnection) thumbnailUrl.openConnection();

            // Set connection properties
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(30000); // 30 seconds
            connection.setReadTimeout(60000); // 60 seconds
            connection.setRequestProperty("User-Agent", "YourApp/1.0");
            connection.setInstanceFollowRedirects(true);

            // Check response code
            int responseCode = connection.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                throw new IOException("HTTP error code: " + responseCode + " for URL: " + url);
            }

            // Check content type
            String contentType = connection.getContentType();
            if (contentType != null && !contentType.startsWith("image/")) {
                log.warn("Content type is not an image: {} for URL: {}", contentType, url);
            }

            // Read the image data
            try (InputStream inputStream = connection.getInputStream();
                 ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                }

                byte[] imageData = outputStream.toByteArray();
                log.debug("Downloaded {} bytes from URL: {}", imageData.length, url);

                return imageData;
            }

        } catch (Exception e) {
            log.error("Error downloading thumbnail from URL: {}", url, e);
        }
        return null;
    }

    /**
     * Upload custom thumbnail for a video
     */
    private void uploadThumbnail(YouTube youtubeService, String videoId, String thumbnailUrl) throws IOException {
        log.info("Uploading thumbnail for video: {} from URL: {}", videoId, thumbnailUrl);

        try {
            // Download thumbnail from the provided URL
            byte[] thumbnailData = self.downloadFromPublicUrl(thumbnailUrl);

            if (thumbnailData == null || thumbnailData.length == 0) {
                // Handle with sending notification
               return;
            }

            // Validate thumbnail size (max 2MB for YouTube)
            if (thumbnailData.length > MAX_THUMBNAIL_SIZE) {
                throw new IOException("Thumbnail file too large. Maximum size is 2MB, current size: " +
                        String.format("%.2fMB", thumbnailData.length / (1024.0 * 1024.0)));
            }

            // Validate image format by checking file header
            if (!isValidImageFormat(thumbnailData)) {
                throw new IOException("Invalid thumbnail format. YouTube accepts JPG, GIF, BMP, PNG formats.");
            }

            // Upload thumbnail
            try (InputStream thumbnailStream = new ByteArrayInputStream(thumbnailData)) {
                InputStreamContent thumbnailContent = new InputStreamContent("image/*", thumbnailStream);
                thumbnailContent.setLength(thumbnailData.length);

                YouTube.Thumbnails.Set thumbnailSet = youtubeService.thumbnails()
                        .set(videoId, thumbnailContent);

                ThumbnailSetResponse response = thumbnailSet.execute();
                log.info("Thumbnail upload successful for video: {}. Response: {}", videoId, response.toPrettyString());
            }

        } catch (Exception e) {
            log.error("Error downloading or uploading thumbnail for video {}: {}", videoId, e.getMessage());
            throw new IOException("Thumbnail upload failed: " + e.getMessage(), e);
        }
    }

    /**
     * Validate image format by checking file headers
     */
    private boolean isValidImageFormat(byte[] imageData) {
        if (imageData.length < 8) {
            return false;
        }

        // Check for common image format signatures
        // JPEG: FF D8 FF
        if (imageData[0] == (byte) 0xFF && imageData[1] == (byte) 0xD8 && imageData[2] == (byte) 0xFF) {
            return true;
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (imageData[0] == (byte) 0x89 && imageData[1] == 0x50 && imageData[2] == 0x4E && imageData[3] == 0x47) {
            return true;
        }

        // GIF: 47 49 46 38
        if (imageData[0] == 0x47 && imageData[1] == 0x49 && imageData[2] == 0x46 && imageData[3] == 0x38) {
            return true;
        }

        // BMP: 42 4D
        if (imageData[0] == 0x42 && imageData[1] == 0x4D) {
            return true;
        }

        return false;
    }

    /**
     * Simple URL validation
     */
    private boolean isValidUrl(String url) {
        try {
            new java.net.URL(url);
            return url.startsWith("http://") || url.startsWith("https://");
        } catch (Exception e) {
            return false;
        }
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

    private String formatDescriptionWithChapters(VideoMetadataResponseDTO metadata) throws IOException {
        StringBuilder description = new StringBuilder();

        // Add main description first
        if (metadata.getDescription() != null && !metadata.getDescription().trim().isEmpty()) {
            description.append(metadata.getDescription().trim());
        }

        // Add chapters if provided
        if (metadata.getVideoChapters() != null && !metadata.getVideoChapters().isEmpty()) {
            // Add separator between description and chapters
            if (description.length() > 0) {
                description.append("\n\n");
            }

            // Add chapters section header (optional)
            description.append("📍 CHAPTERS:\n");

            // Validate and add chapters
            List<VideoChapterDTO> validChapters = validateAndSortChapters(metadata.getVideoChapters());
            for (VideoChapterDTO chapter : validChapters) {
                description.append(chapter.toString()).append("\n");
            }
        }

        return description.toString();
    }

    /**
     * Validates and sorts chapters by timestamp
     */
    private List<VideoChapterDTO> validateAndSortChapters(List<VideoChapterDTO> chapters) throws IOException {
        if (chapters.isEmpty()) {
            return chapters;
        }

        // YouTube requirements for chapters:
        // 1. Must have at least 3 chapters
        // 2. Each chapter must be at least 10 seconds long
        // 3. First chapter must start at 0:00
        // 4. Timestamps must be in ascending order

        if (chapters.size() < 3) {
            throw new IOException("YouTube requires at least 3 chapters for automatic chapter detection");
        }

        // Validate timestamp formats and convert to seconds for sorting
        List<VideoChapterWithSeconds> chaptersWithSeconds = new ArrayList<>();
        Pattern timestampPattern = Pattern.compile("^(\\d+):(\\d{2})(?::(\\d{2}))?$");

        for (VideoChapterDTO chapter : chapters) {
            Matcher matcher = timestampPattern.matcher(chapter.getTimestamp().trim());
            if (!matcher.matches()) {
                throw new IOException("Invalid timestamp format: " + chapter.getTimestamp() +
                        ". Use format MM:SS or HH:MM:SS");
            }

            // Convert to seconds for validation
            int totalSeconds = parseTimestampToSeconds(chapter.getTimestamp().trim());
            chaptersWithSeconds.add(new VideoChapterWithSeconds(chapter, totalSeconds));
        }

        // Sort by timestamp
        chaptersWithSeconds.sort((a, b) -> Integer.compare(a.getSeconds(), b.getSeconds()));

        // Validate first chapter starts at 0:00
        if (chaptersWithSeconds.getFirst().getSeconds() != 0) {
            throw new IOException("First chapter must start at 0:00");
        }

        // Validate minimum 10 seconds between chapters
        for (int i = 1; i < chaptersWithSeconds.size(); i++) {
            int timeDiff = chaptersWithSeconds.get(i).getSeconds() - chaptersWithSeconds.get(i - 1).getSeconds();
            if (timeDiff < 10) {
                throw new IOException("Each chapter must be at least 10 seconds long. " +
                        "Chapter at " + chaptersWithSeconds.get(i).getChapter().getTimestamp() +
                        " is only " + timeDiff + " seconds after the previous chapter");
            }
        }

        // Return sorted chapters
        return chaptersWithSeconds.stream()
                .map(VideoChapterWithSeconds::getChapter)
                .collect(Collectors.toList());
    }


    private int parseTimestampToSeconds(String timestamp) {
        String[] parts = timestamp.split(":");

        if (parts.length == 2) {
            // MM:SS format
            int minutes = Integer.parseInt(parts[0]);
            int seconds = Integer.parseInt(parts[1]);
            return minutes * 60 + seconds;
        } else if (parts.length == 3) {
            // HH:MM:SS format
            int hours = Integer.parseInt(parts[0]);
            int minutes = Integer.parseInt(parts[1]);
            int seconds = Integer.parseInt(parts[2]);
            return hours * 3600 + minutes * 60 + seconds;
        }

        throw new IllegalArgumentException("Invalid timestamp format: " + timestamp);
    }
}