package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.PrivacyLevel;
import com.insp17.ytms.entity.TaskPriority;

import java.util.List;

public class CreateTaskRequest {
    private String title;
    private String description;
    private TaskPriority priority;
    private PrivacyLevel privacyLevel;
    private String deadline;
    private Long assignedEditorId;
    private String rawVideoUrl;
    private String rawVideoFilename;
    private List<String> tags;
    private List<Long> userIds;

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

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public List<Long> getUserIds() {
        return userIds;
    }

    public void setUserIds(List<Long> userIds) {
        this.userIds = userIds;
    }
}
