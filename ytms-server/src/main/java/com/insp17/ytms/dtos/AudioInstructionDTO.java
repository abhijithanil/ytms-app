package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.AudioInstruction;

import java.time.LocalDateTime;

public class AudioInstructionDTO {
    private Long id;
    private Long videoTaskId;
    private String audioUrl;
    private String audioFilename;
    private String description;
    private UserDTO uploadedBy;
    private LocalDateTime createdAt;

    public AudioInstructionDTO() {}

    public AudioInstructionDTO(AudioInstruction audio) {
        this.id = audio.getId();
        this.videoTaskId = audio.getVideoTask().getId();
        this.audioUrl = audio.getAudioUrl();
        this.audioFilename = audio.getAudioFilename();
        this.description = audio.getDescription();
        this.uploadedBy = audio.getUploadedBy() != null ? new UserDTO(audio.getUploadedBy()) : null;
        this.createdAt = audio.getCreatedAt();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getVideoTaskId() { return videoTaskId; }
    public void setVideoTaskId(Long videoTaskId) { this.videoTaskId = videoTaskId; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }

    public String getAudioFilename() { return audioFilename; }
    public void setAudioFilename(String audioFilename) { this.audioFilename = audioFilename; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public UserDTO getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(UserDTO uploadedBy) { this.uploadedBy = uploadedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
