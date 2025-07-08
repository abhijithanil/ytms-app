package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.User;

public class RevisionRequest {
    private Long videoTaskId;
    private String editedVideoUrl;
    private String editedVideoFilename;
    private String notes;
    private User uploadedBy;


    public String getEditedVideoUrl() {
        return editedVideoUrl;
    }

    public void setEditedVideoUrl(String editedVideoUrl) {
        this.editedVideoUrl = editedVideoUrl;
    }

    public String getEditedVideoFilename() {
        return editedVideoFilename;
    }

    public void setEditedVideoFilename(String editedVideoFilename) {
        this.editedVideoFilename = editedVideoFilename;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public User getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(User uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public Long getVideoTaskId() {
        return videoTaskId;
    }

    public void setVideoTaskId(Long videoTaskId) {
        this.videoTaskId = videoTaskId;
    }
}
