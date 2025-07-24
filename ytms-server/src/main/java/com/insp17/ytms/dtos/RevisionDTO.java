package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.Revision;

import java.time.LocalDateTime;

public class RevisionDTO {
    private Long id;
    private Long videoTaskId;
    private Integer revisionNumber;
    private String editedVideoUrl;
    private String editedVideoFilename;
    private String notes;
    private UserDTO uploadedBy;
    private LocalDateTime createdAt;
    private String type; // "main" or "short"
    private Long fileSize; // File size in bytes

    public RevisionDTO() {
    }

    public RevisionDTO(Revision revision) {
        this.id = revision.getId();
        this.videoTaskId = revision.getVideoTask().getId();
        this.revisionNumber = revision.getRevisionNumber();
        this.editedVideoUrl = revision.getEditedVideoUrl();
        this.editedVideoFilename = revision.getEditedVideoFilename();
        this.notes = revision.getNotes();
        this.uploadedBy = revision.getUploadedBy() != null ? new UserDTO(revision.getUploadedBy()) : null;
        this.createdAt = revision.getCreatedAt();
        this.type = revision.getType() != null ? revision.getType() : "main"; // Default to main if null
        this.fileSize = revision.getFileSize();
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVideoTaskId() {
        return videoTaskId;
    }

    public void setVideoTaskId(Long videoTaskId) {
        this.videoTaskId = videoTaskId;
    }

    public Integer getRevisionNumber() {
        return revisionNumber;
    }

    public void setRevisionNumber(Integer revisionNumber) {
        this.revisionNumber = revisionNumber;
    }

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

    public UserDTO getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(UserDTO uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }
}