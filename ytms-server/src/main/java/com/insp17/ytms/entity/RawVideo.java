package com.insp17.ytms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "raw_videos")
public class RawVideo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "video_task_id")
    private VideoTask videoTask;

    @Column(name = "video_url", nullable = false)
    private String videoUrl;

    @Column(name = "filename", nullable = false)
    private String filename;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "video_order")
    private Integer videoOrder;

    @Column(name = "description")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "uploaded_by_id")
    private User uploadedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Constructors
    public RawVideo() {
        this.createdAt = LocalDateTime.now();
    }

    public RawVideo(VideoTask videoTask, String videoUrl, String filename, User uploadedBy) {
        this.videoTask = videoTask;
        this.videoUrl = videoUrl;
        this.filename = filename;
        this.uploadedBy = uploadedBy;
        this.createdAt = LocalDateTime.now();
    }

    public RawVideo(VideoTask videoTask, String videoUrl, String filename, Long fileSize,
                    Integer videoOrder, String description, User uploadedBy) {
        this.videoTask = videoTask;
        this.videoUrl = videoUrl;
        this.filename = filename;
        this.fileSize = fileSize;
        this.videoOrder = videoOrder;
        this.description = description;
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

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public Integer getVideoOrder() {
        return videoOrder;
    }

    public void setVideoOrder(Integer videoOrder) {
        this.videoOrder = videoOrder;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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