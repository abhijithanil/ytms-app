package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.VideoTask;
import com.insp17.ytms.entity.TaskStatus;
import com.insp17.ytms.entity.TaskPriority;
import com.insp17.ytms.entity.PrivacyLevel;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class VideoTaskDTO {
    private Long id;
    private String title;
    private String description;

    // Legacy single video support (kept for backward compatibility)
    private String rawVideoUrl;
    private String rawVideoFilename;

    // NEW: Multiple raw videos support
    private List<RawVideoDTO> rawVideos = new ArrayList<>();

    private UserDTO assignedEditor;
    private UserDTO createdBy;
    private TaskStatus status;
    private TaskPriority priority;
    private PrivacyLevel privacyLevel;
    private LocalDateTime deadline;
    private LocalDateTime youtubeUploadTime;
    private String youtubeVideoId;
    private Set<String> tags = new HashSet<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<RevisionDTO> revisions = new ArrayList<>();
    private List<CommentDTO> comments = new ArrayList<>();
    private List<AudioInstructionDTO> audioInstructions = new ArrayList<>();

    // Constructors
    public VideoTaskDTO() {}

    public VideoTaskDTO(VideoTask task) {
        this.id = task.getId();
        this.title = task.getTitle();
        this.description = task.getDescription();

        // Legacy fields
        this.rawVideoUrl = task.getRawVideoUrl();
        this.rawVideoFilename = task.getRawVideoFilename();

        // NEW: Multiple raw videos
        if (task.getRawVideos() != null) {
            this.rawVideos = task.getRawVideos().stream()
                    .map(RawVideoDTO::new)
                    .collect(Collectors.toList());
        }

        this.assignedEditor = task.getAssignedEditor() != null ? new UserDTO(task.getAssignedEditor()) : null;
        this.createdBy = task.getCreatedBy() != null ? new UserDTO(task.getCreatedBy()) : null;
        this.status = task.getTaskStatus();
        this.priority = task.getTaskPriority();
        this.privacyLevel = task.getPrivacyLevel();
        this.deadline = task.getDeadline();
        this.youtubeUploadTime = task.getYoutubeUploadTime();
        this.youtubeVideoId = task.getYoutubeVideoId();
        this.tags = task.getTags() != null ? new HashSet<>(task.getTags()) : new HashSet<>();
        this.createdAt = task.getCreatedAt();
        this.updatedAt = task.getUpdatedAt();

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

    // Helper methods
    public List<RawVideoDTO> getMainVideos() {
        return rawVideos.stream()
                .filter(video -> "main".equals(video.getType()))
                .collect(Collectors.toList());
    }

    public List<RawVideoDTO> getShortVideos() {
        return rawVideos.stream()
                .filter(video -> "short".equals(video.getType()))
                .collect(Collectors.toList());
    }

    public RawVideoDTO getPrimaryMainVideo() {
        return rawVideos.stream()
                .filter(video -> "main".equals(video.getType()))
                .findFirst()
                .orElse(null);
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public List<RawVideoDTO> getRawVideos() {
        return rawVideos;
    }

    public void setRawVideos(List<RawVideoDTO> rawVideos) {
        this.rawVideos = rawVideos;
    }

    public UserDTO getAssignedEditor() {
        return assignedEditor;
    }

    public void setAssignedEditor(UserDTO assignedEditor) {
        this.assignedEditor = assignedEditor;
    }

    public UserDTO getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UserDTO createdBy) {
        this.createdBy = createdBy;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
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

    public LocalDateTime getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDateTime deadline) {
        this.deadline = deadline;
    }

    public LocalDateTime getYoutubeUploadTime() {
        return youtubeUploadTime;
    }

    public void setYoutubeUploadTime(LocalDateTime youtubeUploadTime) {
        this.youtubeUploadTime = youtubeUploadTime;
    }

    public String getYoutubeVideoId() {
        return youtubeVideoId;
    }

    public void setYoutubeVideoId(String youtubeVideoId) {
        this.youtubeVideoId = youtubeVideoId;
    }

    public Set<String> getTags() {
        return tags;
    }

    public void setTags(Set<String> tags) {
        this.tags = tags;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<RevisionDTO> getRevisions() {
        return revisions;
    }

    public void setRevisions(List<RevisionDTO> revisions) {
        this.revisions = revisions;
    }

    public List<CommentDTO> getComments() {
        return comments;
    }

    public void setComments(List<CommentDTO> comments) {
        this.comments = comments;
    }

    public List<AudioInstructionDTO> getAudioInstructions() {
        return audioInstructions;
    }

    public void setAudioInstructions(List<AudioInstructionDTO> audioInstructions) {
        this.audioInstructions = audioInstructions;
    }
}