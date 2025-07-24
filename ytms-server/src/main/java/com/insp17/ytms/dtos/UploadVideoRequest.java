package com.insp17.ytms.dtos;

import java.util.List;

public class UploadVideoRequest {
    private Long videoId; // Task ID
    private Long channelId;

    // NEW: Support for multiple video uploads
    private List<VideoUploadItem> videosToUpload;

    // Legacy single video support
    private Long revisionId;


    // Default constructor
    public UploadVideoRequest() {
    }

    // Legacy constructor for single video upload
    public UploadVideoRequest(Long videoId, Long channelId) {
        this.videoId = videoId;
        this.channelId = channelId;
    }

    // New constructor for multiple video uploads
    public UploadVideoRequest(Long videoId, List<VideoUploadItem> videosToUpload) {
        this.videoId = videoId;
        this.videosToUpload = videosToUpload;
    }

    // Getters and setters
    public Long getVideoId() {
        return videoId;
    }

    public void setVideoId(Long videoId) {
        this.videoId = videoId;
    }

    public Long getChannelId() {
        return channelId;
    }

    public void setChannelId(Long channelId) {
        this.channelId = channelId;
    }

    public List<VideoUploadItem> getVideosToUpload() {
        return videosToUpload;
    }

    public void setVideosToUpload(List<VideoUploadItem> videosToUpload) {
        this.videosToUpload = videosToUpload;
    }

    public Long getRevisionId() {
        return revisionId;
    }

    public void setRevisionId(Long revisionId) {
        this.revisionId = revisionId;
    }

    // Helper methods
    public boolean isMultipleUpload() {
        return videosToUpload != null && !videosToUpload.isEmpty();
    }

    public boolean isSingleUpload() {
        return !isMultipleUpload() && (channelId != null || revisionId != null);
    }

    @Override
    public String toString() {
        return "UploadVideoRequest{" +
                "videoId=" + videoId +
                ", channelId=" + channelId +
                ", videosToUpload=" + videosToUpload +
                ", revisionId=" + revisionId +
                '}';
    }
}