package com.insp17.ytms.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.insp17.ytms.entity.PrivacyLevel;
import com.insp17.ytms.entity.TaskPriority;

import java.util.ArrayList;
import java.util.List;

@JsonDeserialize
public class CreateTaskRequest {
    private String title;
    private String description;
    private TaskPriority priority;
    private PrivacyLevel privacyLevel;
    private String deadline;
    private Long assignedEditorId;

    // Legacy single video support (kept for backward compatibility)
    private String rawVideoUrl;
    private String rawVideoFilename;

    // NEW: Multiple raw videos support
    @JsonProperty("rawVideos")
    private List<RawVideoInfo> rawVideos = new ArrayList<>();

    @JsonProperty("tags")
    private List<String> tags = new ArrayList<>();

    @JsonProperty("userIds")
    private List<Long> userIds = new ArrayList<>();

    @JsonProperty("comments")
    private List<String> comments = new ArrayList<>();

    @JsonProperty("audioInstructionUrls")
    private List<String> audioInstructionUrls = new ArrayList<>();

    // Inner class for raw video information
    public static class RawVideoInfo {
        private String url;
        private String filename;
        private String type; // "main" or "short"
        private Long size;

        public RawVideoInfo() {}

        public RawVideoInfo(String url, String filename, String type, Long size) {
            this.url = url;
            this.filename = filename;
            this.type = type;
            this.size = size;
        }

        // Getters and setters
        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getFilename() {
            return filename;
        }

        public void setFilename(String filename) {
            this.filename = filename;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public Long getSize() {
            return size;
        }

        public void setSize(Long size) {
            this.size = size;
        }
    }

    // Default constructor
    public CreateTaskRequest() {
    }

    // Getters and Setters
    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public TaskPriority getPriority() {
        return priority;
    }

    public void setPriority(TaskPriority priority) {
        this.priority = priority;
    }

    public PrivacyLevel getPrivacyLevel() {
        return privacyLevel;
    }

    public void setPrivacyLevel(PrivacyLevel privacyLevel) {
        this.privacyLevel = privacyLevel;
    }

    public String getDeadline() {
        return deadline;
    }

    public void setDeadline(String deadline) {
        this.deadline = deadline;
    }

    public Long getAssignedEditorId() {
        return assignedEditorId;
    }

    public void setAssignedEditorId(Long assignedEditorId) {
        this.assignedEditorId = assignedEditorId;
    }

    public String getRawVideoUrl() {
        return rawVideoUrl;
    }

    public void setRawVideoUrl(String rawVideoUrl) {
        this.rawVideoUrl = rawVideoUrl;
    }

    public String getRawVideoFilename() {
        return rawVideoFilename;
    }

    public void setRawVideoFilename(String rawVideoFilename) {
        this.rawVideoFilename = rawVideoFilename;
    }

    public List<RawVideoInfo> getRawVideos() {
        return rawVideos != null ? rawVideos : new ArrayList<>();
    }

    public void setRawVideos(List<RawVideoInfo> rawVideos) {
        this.rawVideos = rawVideos != null ? rawVideos : new ArrayList<>();
    }

    public List<String> getTags() {
        return tags != null ? tags : new ArrayList<>();
    }

    public void setTags(List<String> tags) {
        this.tags = tags != null ? tags : new ArrayList<>();
    }

    public List<Long> getUserIds() {
        return userIds != null ? userIds : new ArrayList<>();
    }

    public void setUserIds(List<Long> userIds) {
        this.userIds = userIds != null ? userIds : new ArrayList<>();
    }

    public List<String> getComments() {
        return comments != null ? comments : new ArrayList<>();
    }

    public void setComments(List<String> comments) {
        this.comments = comments != null ? comments : new ArrayList<>();
    }

    public List<String> getAudioInstructionUrls() {
        return audioInstructionUrls != null ? audioInstructionUrls : new ArrayList<>();
    }

    public void setAudioInstructionUrls(List<String> audioInstructionUrls) {
        this.audioInstructionUrls = audioInstructionUrls != null ? audioInstructionUrls : new ArrayList<>();
    }

    @Override
    public String toString() {
        return "CreateTaskRequest{" +
                "title='" + title + '\'' +
                ", description='" + description + '\'' +
                ", priority=" + priority +
                ", privacyLevel=" + privacyLevel +
                ", deadline='" + deadline + '\'' +
                ", assignedEditorId=" + assignedEditorId +
                ", rawVideoUrl='" + rawVideoUrl + '\'' +
                ", rawVideoFilename='" + rawVideoFilename + '\'' +
                ", rawVideos=" + rawVideos +
                ", tags=" + tags +
                ", userIds=" + userIds +
                ", comments=" + comments +
                ", audioInstructionUrls=" + audioInstructionUrls +
                '}';
    }
}