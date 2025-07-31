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
import com.insp17.ytms.dtos.MultiVideoUploadRequest;
import com.insp17.ytms.dtos.VideoChapterDTO;
import com.insp17.ytms.dtos.VideoMetadataDTO;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.repository.YouTubeChannelRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.GeneralSecurityException;
import java.time.format.DateTimeFormatter;
import java.util.*;
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
    private static final int MAX_TAGS_LENGTH = 500; // Total character limit for all tags
    private static final long MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB
    private static final int MIN_CHAPTER_DURATION = 10; // seconds
    private static final int MIN_CHAPTERS_COUNT = 3;

    // Shorts-specific constraints
    private static final int MAX_SHORTS_DURATION = 60; // seconds
    private static final int MAX_SHORTS_TITLE_LENGTH = 100;
    private static final int MAX_SHORTS_DESCRIPTION_LENGTH = 1000; // Shorter than regular videos

    private static final List<String> SUPPORTED_FORMATS = Arrays.asList(
            ".mov", ".mpeg4", ".mp4", ".avi", ".wmv", ".mpegps", ".flv", ".3gpp", ".webm"
    );
    private static final List<String> VALID_PRIVACY_STATUSES = Arrays.asList("private", "public", "unlisted");
    private static final List<String> VALID_CATEGORIES = Arrays.asList(
            "1", "2", "10", "15", "17", "19", "20", "22", "23", "24", "25", "26", "27", "28"
    );
    private static final List<String> VALID_LICENSES = Arrays.asList("standard", "creativecommon", "creative commons");


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

    @Autowired
    private RevisionService revisionService;

    @Autowired
    private YouTubeChannelRepository youTubeChannelRepository;

//    private final YouTubeService self;
//
//    @Autowired
//    public YouTubeService(@Lazy YouTubeService self) {
//        this.self = self;
//    }

    /**
     * Creates YouTube service with automatic token refresh
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
     * Upload multiple videos to different channels
     */
    @Async("youtubeUploadExecutor")
    public void uploadMultipleVideos(VideoTask task, List<MultiVideoUploadRequest.VideoUploadItem> uploads, User user) {
        log.info("Starting multiple video uploads for task: {} with {} uploads", task.getId(), uploads.size());

        List<String> successfulUploads = new ArrayList<>();
        List<String> failedUploads = new ArrayList<>();

        for (int i = 0; i < uploads.size(); i++) {
            MultiVideoUploadRequest.VideoUploadItem uploadItem = uploads.get(i);

            try {
                log.info("Processing upload {}/{}: Revision {} to Channel {}",
                        i + 1, uploads.size(), uploadItem.getRevisionId(), uploadItem.getChannelId());

                // Get revision and channel
                Revision revision = revisionService.getRevisionById(uploadItem.getRevisionId());
                YouTubeChannel channel = getChannelById(uploadItem.getChannelId());

                validateChannelConnection(channel);

                // Get metadata
                VideoMetadataDTO metadata = getMetadataForUpload(uploadItem);
                validateMetadata(metadata);

                // Upload based on video type
                String videoType = metadata.getVideoType();
                if (VideoType.MAIN.name().equals(videoType)) {
                    uploadSingleRevisionVideoMain(revision, metadata, channel, task, user);
                } else if (VideoType.SHORT.name().equals(videoType)) {
                    uploadSingleRevisionVideoShort(revision, metadata, channel, task, user);
                } else {
                    throw new IOException("Invalid video type: " + videoType);
                }

                String uploadResult = String.format("Revision #%d uploaded to %s",
                        revision.getRevisionNumber(), channel.getChannelName());
                successfulUploads.add(uploadResult);

                log.info("Successfully uploaded revision {} to channel {}",
                        revision.getRevisionNumber(), channel.getChannelName());

            } catch (Exception e) {
                String errorResult = String.format("Revision #%d failed: %s",
                        uploadItem.getRevisionId(), e.getMessage());
                failedUploads.add(errorResult);

                log.error("Failed to upload revision {} to channel {}: {}",
                        uploadItem.getRevisionId(), uploadItem.getChannelId(), e.getMessage(), e);
            }
        }

        updateTaskStatusAfterMultiUpload(task, user, successfulUploads, failedUploads);
    }

    /**
     * Upload a single revision video (Main/Long-form content)
     */
    public void uploadSingleRevisionVideoMain(Revision revision, VideoMetadataDTO metadata,
                                              YouTubeChannel channel, VideoTask task, User user) throws IOException {
        log.info("Uploading main video for revision: {} to channel: {}", revision.getId(), channel.getChannelName());

        // Additional validation for main videos
        validateMainVideoMetadata(metadata);

        uploadVideoInternal(revision, metadata, channel, VideoType.MAIN);
    }

    /**
     * Upload a single revision video (Short/Vertical content)
     */
    public void uploadSingleRevisionVideoShort(Revision revision, VideoMetadataDTO metadata,
                                               YouTubeChannel channel, VideoTask task, User user) throws IOException {
        log.info("Uploading short video for revision: {} to channel: {}", revision.getId(), channel.getChannelName());

        // Additional validation for shorts
        validateShortsMetadata(metadata);

        uploadVideoInternal(revision, metadata, channel, VideoType.SHORT);
    }

    /**
     * Internal method for uploading videos (common logic for both main and shorts)
     */
    private void uploadVideoInternal(Revision revision, VideoMetadataDTO metadata,
                                     YouTubeChannel channel, VideoType videoType) throws IOException {
        try {
            // Download and validate video file
            log.info("Downloading video file from: {}", revision.getEditedVideoUrl());
            byte[] fileContent = fileStorageService.downloadFile(revision.getEditedVideoUrl());
            validateVideoFile(fileContent, revision.getEditedVideoFilename(), videoType);

            // Create video object
            Video videoObject = createVideoObject(metadata, videoType);

            // Upload video
            String videoId = performVideoUpload(fileContent, videoObject, metadata, channel);

            // Post-upload operations
            handlePostUploadOperations(videoId, metadata, channel);

            log.info("Successfully uploaded {} video - ID: {}, Title: {}, Channel: {}",
                    videoType.name().toLowerCase(), videoId, metadata.getTitle(), channel.getChannelName());

        } catch (Exception e) {
            log.error("Failed to upload {} video '{}' to channel '{}': {}",
                    videoType.name().toLowerCase(), metadata.getTitle(), channel.getChannelName(), e.getMessage(), e);
            throw new IOException("Video upload failed: " + e.getMessage(), e);
        }
    }

    /**
     * Performs the actual video upload
     */
    private String performVideoUpload(byte[] fileContent, Video videoObject,
                                      VideoMetadataDTO metadata, YouTubeChannel channel) throws IOException, GeneralSecurityException {
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

            // Set notification preferences
            if (metadata.getNotifySubscribers() != null) {
                videoInsert.setNotifySubscribers(metadata.getNotifySubscribers());
            }

            log.info("Uploading '{}' to channel: {} (account: {})",
                    metadata.getTitle(), channel.getChannelName(), channel.getYoutubeChannelOwnerEmail());

            Video uploadedVideo = videoInsert.execute();
            return uploadedVideo.getId();
        }
    }

    /**
     * Handles post-upload operations like playlists and thumbnails
     */
    private void handlePostUploadOperations(String videoId, VideoMetadataDTO metadata,
                                            YouTubeChannel channel) throws IOException, GeneralSecurityException {
        YouTube youtubeService = getYouTubeService(channel);

        // Add to playlists if specified
        if (metadata.getPlaylistIds() != null && !metadata.getPlaylistIds().isEmpty()) {
            addVideoToPlaylists(videoId, metadata.getPlaylistIds(), youtubeService);
        }

        // Upload custom thumbnail if provided
        if (metadata.getThumbnailUrl() != null && !metadata.getThumbnailUrl().trim().isEmpty()) {
            try {
                uploadThumbnail(youtubeService, videoId, metadata.getThumbnailUrl());
                log.info("Successfully uploaded custom thumbnail for video: {}", videoId);
            } catch (Exception thumbnailError) {
                log.error("Failed to upload thumbnail for video {}: {}", videoId, thumbnailError.getMessage());
                // Don't fail the entire upload if thumbnail fails
            }
        }
    }

    /**
     * Validates metadata specifically for main videos
     */
    private void validateMainVideoMetadata(VideoMetadataDTO metadata) throws IOException {
        // Main videos can have chapters
        if (metadata.getVideoChapters() != null && !metadata.getVideoChapters().isEmpty()) {
            validateAndSortChapters(metadata.getVideoChapters());
        }

        // Main videos can have end screens and cards
        // No additional specific validation needed beyond general validation
    }

    /**
     * Validates metadata specifically for YouTube Shorts
     */
    private void validateShortsMetadata(VideoMetadataDTO metadata) throws IOException {
        // Shorts have shorter title limits
        if (metadata.getTitle().length() > MAX_SHORTS_TITLE_LENGTH) {
            throw new IOException(String.format(
                    "Shorts title exceeds %d character limit. Current length: %d",
                    MAX_SHORTS_TITLE_LENGTH, metadata.getTitle().length()
            ));
        }

        // Shorts have shorter description limits
        if (metadata.getDescription() != null && metadata.getDescription().length() > MAX_SHORTS_DESCRIPTION_LENGTH) {
            throw new IOException(String.format(
                    "Shorts description exceeds %d character limit. Current length: %d",
                    MAX_SHORTS_DESCRIPTION_LENGTH, metadata.getDescription().length()
            ));
        }

        // Shorts cannot have chapters
        if (metadata.getVideoChapters() != null && !metadata.getVideoChapters().isEmpty()) {
            log.warn("YouTube Shorts do not support chapters. Chapters will be ignored.");
        }

        // Shorts cannot have end screens or cards
        if (metadata.getEndScreen() != null && !metadata.getEndScreen().trim().isEmpty()) {
            log.warn("YouTube Shorts do not support end screens. End screen will be ignored.");
        }

        if (metadata.getCards() != null && !metadata.getCards().trim().isEmpty()) {
            log.warn("YouTube Shorts do not support cards. Cards will be ignored.");
        }

        // Validate hashtags for Shorts
        if (metadata.getShortHashtags() != null && !metadata.getShortHashtags().trim().isEmpty()) {
            validateHashtags(metadata.getShortHashtags());
        }
    }

    /**
     * Validates hashtags for Shorts
     */
    private void validateHashtags(String hashtags) throws IOException {
        if (hashtags == null || hashtags.trim().isEmpty()) {
            return;
        }

        String[] hashtagArray = hashtags.split("\\s+");

        if (hashtagArray.length > 15) { // YouTube recommends max 15 hashtags
            throw new IOException("Too many hashtags. Maximum recommended: 15, found: " + hashtagArray.length);
        }

        for (String hashtag : hashtagArray) {
            if (!hashtag.startsWith("#")) {
                throw new IOException("Invalid hashtag format: " + hashtag + ". Hashtags must start with #");
            }

            if (hashtag.length() > 100) { // Individual hashtag limit
                throw new IOException("Hashtag too long: " + hashtag + ". Maximum length: 100 characters");
            }
        }
    }

    /**
     * Enhanced metadata validation
     */
    private void validateMetadata(VideoMetadataDTO metadata) throws IOException {
        // Basic validation
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

        // Privacy status validation
        if (metadata.getPrivacyStatus() == null ||
                !VALID_PRIVACY_STATUSES.contains(metadata.getPrivacyStatus().toLowerCase())) {
            throw new IOException(String.format(
                    "Invalid privacy status: %s. Valid options: %s",
                    metadata.getPrivacyStatus(), String.join(", ", VALID_PRIVACY_STATUSES)
            ));
        }

        // Category validation
        if (metadata.getCategory() != null && !VALID_CATEGORIES.contains(metadata.getCategory())) {
            throw new IOException(String.format(
                    "Invalid category: %s. Valid categories: %s",
                    metadata.getCategory(), String.join(", ", VALID_CATEGORIES)
            ));
        }

        // Tags validation
        validateTags(metadata.getTags());

        // Thumbnail URL validation
        if (metadata.getThumbnailUrl() != null && !metadata.getThumbnailUrl().trim().isEmpty()) {
            if (!isValidUrl(metadata.getThumbnailUrl())) {
                throw new IOException("Invalid thumbnail URL format: " + metadata.getThumbnailUrl());
            }
        }

        // License validation
        if (metadata.getLicense() != null && !metadata.getLicense().trim().isEmpty()) {
            String license = metadata.getLicense().toLowerCase().trim();
            if (!VALID_LICENSES.contains(license)) {
                throw new IOException(String.format(
                        "Invalid license: %s. Valid options: %s",
                        metadata.getLicense(), String.join(", ", VALID_LICENSES)
                ));
            }
        }

        // Video type validation
        if (metadata.getVideoType() == null) {
            throw new IOException("Video type is required");
        }

        try {
            VideoType.valueOf(metadata.getVideoType());
        } catch (IllegalArgumentException e) {
            throw new IOException("Invalid video type: " + metadata.getVideoType() +
                    ". Valid types: " + Arrays.toString(VideoType.values()));
        }

        log.info("Video metadata validation passed for: {}", metadata.getTitle());
    }

    /**
     * Enhanced tags validation
     */
    private void validateTags(Set<String> tags) throws IOException {
        if (tags == null || tags.isEmpty()) {
            return;
        }

        if (tags.size() > MAX_TAGS_COUNT) {
            throw new IOException(String.format(
                    "Too many tags. Maximum allowed: %d. Current count: %d",
                    MAX_TAGS_COUNT, tags.size()
            ));
        }

        // Check total character length
        int totalLength = tags.stream().mapToInt(String::length).sum();
        if (totalLength > MAX_TAGS_LENGTH) {
            throw new IOException(String.format(
                    "Total tags length exceeds %d character limit. Current length: %d",
                    MAX_TAGS_LENGTH, totalLength
            ));
        }

        // Validate individual tags
        for (String tag : tags) {
            if (tag.trim().isEmpty()) {
                throw new IOException("Empty tags are not allowed");
            }

            if (tag.length() > 100) { // Individual tag limit
                throw new IOException("Tag too long: '" + tag + "'. Maximum length: 100 characters");
            }
        }
    }

    /**
     * Enhanced video file validation
     */
    private void validateVideoFile(byte[] fileContent, String fileName, VideoType videoType) throws IOException {
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

        // Additional validation for Shorts (duration would need to be checked via metadata or video analysis)
        if (videoType == VideoType.SHORT) {
            log.info("Uploading as YouTube Short. Ensure video is vertical (9:16 aspect ratio) and under 60 seconds.");
        }

        log.info("Video file validation passed. Size: {:.2f}MB, Type: {}",
                fileContent.length / (1024.0 * 1024.0), videoType);
    }

    /**
     * Enhanced video object creation with support for Shorts
     */
    private Video createVideoObject(VideoMetadataDTO metadata, VideoType videoType) throws IOException {
        VideoSnippet snippet = new VideoSnippet();
        snippet.setTitle(metadata.getTitle());

        // Handle description based on video type
        String description = formatDescription(metadata, videoType);
        snippet.setDescription(description);

        // Set category
        if (metadata.getCategory() != null) {
            snippet.setCategoryId(metadata.getCategory());
        }

        // Set language
        if (metadata.getLanguage() != null) {
            snippet.setDefaultLanguage(metadata.getLanguage());
        }

        // Set tags
        if (metadata.getTags() != null && !metadata.getTags().isEmpty()) {
            snippet.setTags(new ArrayList<>(metadata.getTags()));
        }

        // Create video status
        VideoStatus status = new VideoStatus();
        status.setPrivacyStatus(metadata.getPrivacyStatus());
        status.setMadeForKids(metadata.getMadeForKids() != null ? metadata.getMadeForKids() : false);

        // Handle license - YouTube API now only accepts specific values
        if (metadata.getLicense() != null && !metadata.getLicense().trim().isEmpty()) {
            String license = metadata.getLicense().toLowerCase().trim();
            if (license.equals("creative commons") || license.equals("creativecommon")) {
                status.setLicense("creativeCommon");
            } else {
                // For YouTube Standard License or any other value, don't set license (it defaults to standard)
                // YouTube API no longer accepts "YouTube Standard License" as a string value
                log.debug("Using default YouTube Standard License (not setting license field)");
            }
        }

        // Set publishing schedule if provided
        if (metadata.getScheduledPublishTime() != null) {
            status.setPublishAt(com.google.api.client.util.DateTime.parseRfc3339(
                    metadata.getScheduledPublishTime().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z"
            ));
        }

        // Create video object
        Video videoObject = new Video();
        videoObject.setSnippet(snippet);
        videoObject.setStatus(status);

        return videoObject;
    }

    /**
     * Formats description based on video type
     */
    private String formatDescription(VideoMetadataDTO metadata, VideoType videoType) throws IOException {
        StringBuilder description = new StringBuilder();

        // Add main description
        if (metadata.getDescription() != null && !metadata.getDescription().trim().isEmpty()) {
            description.append(metadata.getDescription().trim());
        }

        // For Shorts, add hashtags to description
        if (videoType == VideoType.SHORT && metadata.getShortHashtags() != null &&
                !metadata.getShortHashtags().trim().isEmpty()) {
            if (!description.isEmpty()) {
                description.append("\n\n");
            }
            description.append(metadata.getShortHashtags());
        }

        // For main videos, add chapters if provided
        if (videoType == VideoType.MAIN && metadata.getVideoChapters() != null &&
                !metadata.getVideoChapters().isEmpty()) {
            if (!description.isEmpty()) {
                description.append("\n\n");
            }
            description.append("CHAPTERS:\n");

            List<VideoChapterDTO> validChapters = validateAndSortChapters(metadata.getVideoChapters());
            for (VideoChapterDTO chapter : validChapters) {
                description.append(chapter.getTimestamp()).append(" ").append(chapter.getTitle()).append("\n");
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

        if (chapters.size() < MIN_CHAPTERS_COUNT) {
            throw new IOException("YouTube requires at least " + MIN_CHAPTERS_COUNT + " chapters for automatic chapter detection");
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

            int totalSeconds = parseTimestampToSeconds(chapter.getTimestamp().trim());
            chaptersWithSeconds.add(new VideoChapterWithSeconds(chapter, totalSeconds));
        }

        // Sort by timestamp
        chaptersWithSeconds.sort(Comparator.comparingInt(VideoChapterWithSeconds::getSeconds));

        // Validate first chapter starts at 0:00
        if (chaptersWithSeconds.get(0).getSeconds() != 0) {
            throw new IOException("First chapter must start at 0:00");
        }

        // Validate minimum duration between chapters
        for (int i = 1; i < chaptersWithSeconds.size(); i++) {
            int timeDiff = chaptersWithSeconds.get(i).getSeconds() - chaptersWithSeconds.get(i - 1).getSeconds();
            if (timeDiff < MIN_CHAPTER_DURATION) {
                throw new IOException("Each chapter must be at least " + MIN_CHAPTER_DURATION + " seconds long. " +
                        "Chapter at " + chaptersWithSeconds.get(i).getChapter().getTimestamp() +
                        " is only " + timeDiff + " seconds after the previous chapter");
            }
        }

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

    /**
     * Helper class for chapter validation
     */
    private static class VideoChapterWithSeconds {
        private final VideoChapterDTO chapter;
        private final int seconds;

        public VideoChapterWithSeconds(VideoChapterDTO chapter, int seconds) {
            this.chapter = chapter;
            this.seconds = seconds;
        }

        public VideoChapterDTO getChapter() { return chapter; }
        public int getSeconds() { return seconds; }
    }

    // Method to add video to playlists after upload
    private void addVideoToPlaylists(String videoId, Set<String> playlistIds, YouTube youtube) throws IOException {
        if (playlistIds == null || playlistIds.isEmpty()) {
            return;
        }

        for (String playlistId : playlistIds) {
            try {
                PlaylistItem playlistItem = new PlaylistItem();
                PlaylistItemSnippet snippet = new PlaylistItemSnippet();
                snippet.setPlaylistId(playlistId);

                ResourceId resourceId = new ResourceId();
                resourceId.setKind("youtube#video");
                resourceId.setVideoId(videoId);
                snippet.setResourceId(resourceId);
                playlistItem.setSnippet(snippet);

                YouTube.PlaylistItems.Insert playlistItemsInsert =
                        youtube.playlistItems().insert(List.of("snippet"), playlistItem);

                playlistItemsInsert.execute();
                log.info("Added video {} to playlist {}", videoId, playlistId);

            } catch (IOException e) {
                log.error("Failed to add video {} to playlist {}: {}", videoId, playlistId, e.getMessage());
            }
        }
    }

    /**
     * Upload custom thumbnail for a video
     */
    private void uploadThumbnail(YouTube youtubeService, String videoId, String thumbnailUrl) throws IOException {
        log.info("Uploading thumbnail for video: {} from URL: {}", videoId, thumbnailUrl);

        try {
            byte[] thumbnailData = downloadFromPublicUrl(thumbnailUrl);

            if (thumbnailData == null || thumbnailData.length == 0) {
                throw new IOException("Failed to download thumbnail data");
            }

            if (thumbnailData.length > MAX_THUMBNAIL_SIZE) {
                throw new IOException("Thumbnail file too large. Maximum size is 2MB, current size: " +
                        String.format("%.2fMB", thumbnailData.length / (1024.0 * 1024.0)));
            }

            if (!isValidImageFormat(thumbnailData)) {
                throw new IOException("Invalid thumbnail format. YouTube accepts JPG, GIF, BMP, PNG formats.");
            }

            try (InputStream thumbnailStream = new ByteArrayInputStream(thumbnailData)) {
                InputStreamContent thumbnailContent = new InputStreamContent("image/*", thumbnailStream);
                thumbnailContent.setLength(thumbnailData.length);

                YouTube.Thumbnails.Set thumbnailSet = youtubeService.thumbnails()
                        .set(videoId, thumbnailContent);

                ThumbnailSetResponse response = thumbnailSet.execute();
                log.info("Thumbnail upload successful for video: {}", videoId);
            }

        } catch (Exception e) {
            log.error("Error uploading thumbnail for video {}: {}", videoId, e.getMessage());
            throw new IOException("Thumbnail upload failed: " + e.getMessage(), e);
        }
    }

    /**
     * Downloads image data from a public URL
     */
    private byte[] downloadFromPublicUrl(String url) throws IOException {
        log.debug("Downloading thumbnail from public URL: {}", url);

        try {
            URL thumbnailUrl = new URL(url);
            HttpURLConnection connection = (HttpURLConnection) thumbnailUrl.openConnection();

            connection.setRequestMethod("GET");
            connection.setConnectTimeout(30000); // 30 seconds
            connection.setReadTimeout(60000); // 60 seconds
            connection.setRequestProperty("User-Agent", "YourApp/1.0");
            connection.setInstanceFollowRedirects(true);

            int responseCode = connection.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                throw new IOException("HTTP error code: " + responseCode + " for URL: " + url);
            }

            String contentType = connection.getContentType();
            if (contentType != null && !contentType.startsWith("image/")) {
                log.warn("Content type is not an image: {} for URL: {}", contentType, url);
            }

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
            throw new IOException("Failed to download thumbnail: " + e.getMessage(), e);
        }
    }

    /**
     * Validate image format by checking file headers
     */
    private boolean isValidImageFormat(byte[] imageData) {
        if (imageData.length < 8) {
            return false;
        }

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
            new URL(url);
            return url.startsWith("http://") || url.startsWith("https://");
        } catch (Exception e) {
            return false;
        }
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
     * Validates channel connection
     */
    private void validateChannelConnection(YouTubeChannel channel) throws IOException {
        if (channel.getYoutubeChannelOwnerEmail() == null) {
            throw new IOException("YouTube channel owner email is not set");
        }

        if (!youTubeAccountService.isAccountConnected(channel.getYoutubeChannelOwnerEmail())) {
            throw new IOException("YouTube account " + channel.getYoutubeChannelOwnerEmail() +
                    " is not connected. Please connect the account first.");
        }
    }

    /**
     * Gets metadata for upload from upload item
     */
    private VideoMetadataDTO getMetadataForUpload(MultiVideoUploadRequest.VideoUploadItem uploadItem) throws IOException {
        VideoMetadataDTO metadata;
        if (uploadItem.getMetadata() != null) {
            metadata = uploadItem.getMetadata();
        } else {
            try {
                metadata = videoMetadataService.getRevisionMetadata(uploadItem.getRevisionId());
            } catch (Exception e) {
                metadata = null;
            }
        }

        if (metadata == null) {
            throw new IOException("No metadata found for revision " + uploadItem.getRevisionId());
        }

        return metadata;
    }

    /**
     * Updates task status after multi-upload completion
     */
    private void updateTaskStatusAfterMultiUpload(VideoTask task, User user,
                                                  List<String> successfulUploads, List<String> failedUploads) {
        try {
            if (failedUploads.isEmpty()) {
                VideoTask videoTask = videoTaskService.updateTaskStatus(task.getId(), TaskStatus.COMPLETED, user);
                log.info("Video task has been updated successfully: {}", videoTask.getTaskStatus());
                String successComment = String.format(
                        "All %d video(s) uploaded successfully to YouTube:\n%s",
                        successfulUploads.size(),
                        String.join("\n", successfulUploads)
                );
                commentService.addComment(task.getId(), successComment, user);
            } else {
                VideoTask videoTask = videoTaskService.updateTaskStatus(task.getId(), TaskStatus.FAILED_UPLOAD, user);
                log.info("Video task has been updated successfully: {}", videoTask.getTaskStatus());
                String summaryComment = String.format(
                        "Multi-video upload completed with mixed results:\n\nSuccessful (%d):\n%s\n\nFailed (%d):\n%s",
                        successfulUploads.size(),
                        successfulUploads.isEmpty() ? "None" : String.join("\n", successfulUploads),
                        failedUploads.size(),
                        String.join("\n", failedUploads)
                );
                commentService.addComment(task.getId(), summaryComment, user);
            }
        } catch (Exception e) {
            log.error("Failed to update task status after multi-upload", e);
        }

        log.info("Multi-video upload completed for task {}. Success: {}, Failed: {}",
                task.getId(), successfulUploads.size(), failedUploads.size());
    }

    /**
     * Helper method to get channel by ID
     */
    private YouTubeChannel getChannelById(Long channelId) {
        return youTubeChannelRepository.findById(channelId)
                .orElseThrow(() -> new RuntimeException("No channel found with id: " + channelId));
    }

    /**
     * Test if a channel's refresh token is working
     */
    public boolean testChannelConnection(YouTubeChannel channel) {
        try {
            YouTube youtubeService = getYouTubeService(channel);

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
    public List<Channel> getUserYouTubeChannels(YouTubeChannel channel)
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
    public Video updateVideoMetadata(String videoId, VideoMetadataDTO metadata, YouTubeChannel channel)
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

    /**
     * Get all playlists from a specific channel
     */
    public List<Playlist> getAllPlaylistsFromChannel(String channelId, YouTube youtube) throws IOException {
        List<Playlist> allPlaylists = new ArrayList<>();
        String nextPageToken = null;

        do {
            YouTube.Playlists.List request = youtube.playlists()
                    .list(Arrays.asList("snippet", "contentDetails", "status"))
                    .setChannelId(channelId)
                    .setMaxResults(50L);

            if (nextPageToken != null) {
                request.setPageToken(nextPageToken);
            }

            PlaylistListResponse response = request.execute();

            List<Playlist> playlists = response.getItems();
            if (playlists != null) {
                allPlaylists.addAll(playlists);

                for (Playlist playlist : playlists) {
                    log.debug("Found playlist: {} (ID: {}) - {} videos",
                            playlist.getSnippet().getTitle(),
                            playlist.getId(),
                            playlist.getContentDetails().getItemCount());
                }
            }

            nextPageToken = response.getNextPageToken();

        } while (nextPageToken != null);

        log.info("Total playlists found: {}", allPlaylists.size());
        return allPlaylists;
    }

    /**
     * Get playlists with additional filtering options
     */
    public List<Playlist> getPlaylistsWithOptions(YouTubeChannel youTubeChannel, boolean includePrivate)
            throws IOException, GeneralSecurityException {
        List<Playlist> allPlaylists = new ArrayList<>();
        String nextPageToken = null;

        YouTube youtube = getYouTubeService(youTubeChannel);

        do {
            YouTube.Playlists.List request = youtube.playlists()
                    .list(Arrays.asList("snippet", "contentDetails", "status"))
                    .setChannelId(youTubeChannel.getChannelId())
                    .setMaxResults(50L);

            if (nextPageToken != null) {
                request.setPageToken(nextPageToken);
            }

            PlaylistListResponse response = request.execute();
            List<Playlist> playlists = response.getItems();

            if (playlists != null) {
                for (Playlist playlist : playlists) {
                    if (includePrivate || !"private".equals(playlist.getStatus().getPrivacyStatus())) {
                        allPlaylists.add(playlist);
                    }
                }
            }

            nextPageToken = response.getNextPageToken();

        } while (nextPageToken != null);

        return allPlaylists;
    }

    /**
     * Get playlist IDs only (more efficient if you only need IDs)
     */
    public List<String> getPlaylistIds(YouTubeChannel youTubeChannel) throws IOException, GeneralSecurityException {
        List<String> playlistIds = new ArrayList<>();
        String nextPageToken = null;

        YouTube youtube = getYouTubeService(youTubeChannel);

        do {
            YouTube.Playlists.List request = youtube.playlists()
                    .list(Arrays.asList("id"))
                    .setChannelId(youTubeChannel.getChannelId())
                    .setMaxResults(50L);

            if (nextPageToken != null) {
                request.setPageToken(nextPageToken);
            }

            PlaylistListResponse response = request.execute();
            List<Playlist> playlists = response.getItems();

            if (playlists != null) {
                for (Playlist playlist : playlists) {
                    playlistIds.add(playlist.getId());
                }
            }

            nextPageToken = response.getNextPageToken();

        } while (nextPageToken != null);

        return playlistIds;
    }
}