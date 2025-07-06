package com.insp17.ytms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;


// AudioInstruction Entity
@Entity
@Table(name = "audio_instructions")
public class AudioInstruction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "video_task_id")
    private VideoTask videoTask;

    @Column(name = "audio_url")
    private String audioUrl;

    @Column(name = "audio_filename")
    private String audioFilename;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "uploaded_by_id")
    private User uploadedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Constructors, getters, setters
    public AudioInstruction() {}

    public AudioInstruction(VideoTask videoTask, String audioUrl, String audioFilename, String description, User uploadedBy) {
        this.videoTask = videoTask;
        this.audioUrl = audioUrl;
        this.audioFilename = audioFilename;
        this.description = description;
        this.uploadedBy = uploadedBy;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public VideoTask getVideoTask() { return videoTask; }
    public void setVideoTask(VideoTask videoTask) { this.videoTask = videoTask; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }

    public String getAudioFilename() { return audioFilename; }
    public void setAudioFilename(String audioFilename) { this.audioFilename = audioFilename; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public User getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(User uploadedBy) { this.uploadedBy = uploadedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
