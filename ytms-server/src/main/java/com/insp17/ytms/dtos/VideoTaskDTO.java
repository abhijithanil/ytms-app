package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.PrivacyLevel;
import com.insp17.ytms.entity.TaskPriority;
import com.insp17.ytms.entity.TaskStatus;
import com.insp17.ytms.entity.VideoTask;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class VideoTaskDTO {
    private Long id;
    private String title;
    private String description;
    private String rawVideoUrl;
    private String rawVideoFilename;
    private UserDTO assignedEditor;
    private UserDTO createdBy;
    private TaskStatus status;
    private TaskPriority priority;
    private PrivacyLevel privacyLevel;
    private LocalDateTime deadline;
    private LocalDateTime youtubeUploadTime;
    private String youtubeVideoId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<RevisionDTO> revisions;
    private List<CommentDTO> comments;
    private List<AudioInstructionDTO> audioInstructions;
    private VideoMetadataResponseDTO videoMetadataResponseDTO;

    public VideoTaskDTO() {}

    public VideoTaskDTO(VideoTask task) {
        this.id = task.getId();
        this.title = task.getTitle();
        this.description = task.getDescription();
        this.rawVideoUrl = task.getRawVideoUrl();
        this.rawVideoFilename = task.getRawVideoFilename();
        this.assignedEditor = task.getAssignedEditor() != null ? new UserDTO(task.getAssignedEditor()) : null;
        this.createdBy = task.getCreatedBy() != null ? new UserDTO(task.getCreatedBy()) : null;
        this.status = task.getTaskStatus();
        this.priority = task.getTaskPriority();
        this.privacyLevel = task.getPrivacyLevel();
        this.deadline = task.getDeadline();
        this.youtubeUploadTime = task.getYoutubeUploadTime();
        this.youtubeVideoId = task.getYoutubeVideoId();
        this.createdAt = task.getCreatedAt();
        this.updatedAt = task.getUpdatedAt();

        // Only include collections if they are initialized
        if (task.getRevisions() != null) {
            this.revisions = task.getRevisions().stream()
                    .map(RevisionDTO::new)
                    .collect(Collectors.toList());
        }

        if (task.getComments() != null) {
            this.comments = task.getComments().stream()
                    .map(CommentDTO::new)
                    .collect(Collectors.toList());
        }

        if (task.getAudioInstructions() != null) {
            this.audioInstructions = task.getAudioInstructions().stream()
                    .map(AudioInstructionDTO::new)
                    .collect(Collectors.toList());
        }
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRawVideoUrl() { return rawVideoUrl; }
    public void setRawVideoUrl(String rawVideoUrl) { this.rawVideoUrl = rawVideoUrl; }

    public String getRawVideoFilename() { return rawVideoFilename; }
    public void setRawVideoFilename(String rawVideoFilename) { this.rawVideoFilename = rawVideoFilename; }

    public UserDTO getAssignedEditor() { return assignedEditor; }
    public void setAssignedEditor(UserDTO assignedEditor) { this.assignedEditor = assignedEditor; }

    public UserDTO getCreatedBy() { return createdBy; }
    public void setCreatedBy(UserDTO createdBy) { this.createdBy = createdBy; }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }

    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }

    public PrivacyLevel getPrivacyLevel() { return privacyLevel; }
    public void setPrivacyLevel(PrivacyLevel privacyLevel) { this.privacyLevel = privacyLevel; }

    public LocalDateTime getDeadline() { return deadline; }
    public void setDeadline(LocalDateTime deadline) { this.deadline = deadline; }

    public LocalDateTime getYoutubeUploadTime() { return youtubeUploadTime; }
    public void setYoutubeUploadTime(LocalDateTime youtubeUploadTime) { this.youtubeUploadTime = youtubeUploadTime; }

    public String getYoutubeVideoId() { return youtubeVideoId; }
    public void setYoutubeVideoId(String youtubeVideoId) { this.youtubeVideoId = youtubeVideoId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<RevisionDTO> getRevisions() { return revisions; }
    public void setRevisions(List<RevisionDTO> revisions) { this.revisions = revisions; }

    public List<CommentDTO> getComments() { return comments; }
    public void setComments(List<CommentDTO> comments) { this.comments = comments; }

    public List<AudioInstructionDTO> getAudioInstructions() { return audioInstructions; }
    public void setAudioInstructions(List<AudioInstructionDTO> audioInstructions) { this.audioInstructions = audioInstructions; }

    public VideoMetadataResponseDTO getVideoMetadataResponseDTO() {
        return videoMetadataResponseDTO;
    }

    public void setVideoMetadataResponseDTO(VideoMetadataResponseDTO videoMetadataResponseDTO) {
        this.videoMetadataResponseDTO = videoMetadataResponseDTO;
    }
}
