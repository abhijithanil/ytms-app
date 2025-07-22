package com.insp17.ytms.dtos;

public class CreateRevisionRequest {
    private Long taskId;
    private String editedVideoUrl;
    private String notes;
    private Long uploadedById;

    // Getters and setters
    public Long getTaskId() {
        return taskId;
    }

    public void setTaskId(Long taskId) {
        this.taskId = taskId;
    }

    public String getEditedVideoUrl() {
        return editedVideoUrl;
    }

    public void setEditedVideoUrl(String editedVideoUrl) {
        this.editedVideoUrl = editedVideoUrl;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Long getUploadedById() {
        return uploadedById;
    }

    public void setUploadedById(Long uploadedById) {
        this.uploadedById = uploadedById;
    }
}
