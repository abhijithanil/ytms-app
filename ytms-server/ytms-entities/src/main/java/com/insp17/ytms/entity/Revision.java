package com.insp17.ytms.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "revisions")
public class Revision {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "video_task_id")
    private VideoTask videoTask;

    @Column(name = "revision_number")
    private Integer revisionNumber;

    @Column(name = "edited_video_url")
    private String editedVideoUrl;

    @Column(name = "edited_video_filename")
    private String editedVideoFilename;

    @Column(name = "type")
    private String type = "main"; // "main" or "short"

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "uploaded_by_id")
    private User uploadedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Constructors
    public Revision() {
    }

    public Revision(VideoTask videoTask, Integer revisionNumber, String editedVideoUrl,
                    String editedVideoFilename, String notes, User uploadedBy) {
        this.videoTask = videoTask;
        this.revisionNumber = revisionNumber;
        this.editedVideoUrl = editedVideoUrl;
        this.editedVideoFilename = editedVideoFilename;
        this.notes = notes;
        this.uploadedBy = uploadedBy;
        this.createdAt = LocalDateTime.now();
        this.type = "main"; // default type
    }

    public Revision(VideoTask videoTask, Integer revisionNumber, String editedVideoUrl,
                    String editedVideoFilename, String type, String notes, User uploadedBy) {
        this.videoTask = videoTask;
        this.revisionNumber = revisionNumber;
        this.editedVideoUrl = editedVideoUrl;
        this.editedVideoFilename = editedVideoFilename;
        this.type = type;
        this.notes = notes;
        this.uploadedBy = uploadedBy;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public VideoTask getVideoTask() {
        return videoTask;
    }

    public void setVideoTask(VideoTask videoTask) {
        this.videoTask = videoTask;
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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}