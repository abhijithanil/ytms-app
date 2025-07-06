package com.insp17.ytms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// Updated VideoTask Entity with new fields
@Entity
@Table(name = "video_tasks")
public class VideoTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "raw_video_url")
    private String rawVideoUrl;

    @Column(name = "raw_video_filename")
    private String rawVideoFilename;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_editor_id")
    private User assignedEditor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_status")
    private TaskStatus taskStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_priority")
    private TaskPriority taskPriority;

    @Enumerated(EnumType.STRING)
    @Column(name = "privacy_level")
    private PrivacyLevel privacyLevel = PrivacyLevel.ALL;

    @Column(name = "deadline")
    private LocalDateTime deadline;

    @Column(name = "youtube_upload_time")
    private LocalDateTime youtubeUploadTime;

    @Column(name = "youtube_video_id")
    private String youtubeVideoId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "videoTask", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    private List<Revision> revisions = new ArrayList<>();

    @OneToMany(mappedBy = "videoTask", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private Set<Comment> comments = new HashSet<>();

    @OneToMany(mappedBy = "videoTask", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private Set<AudioInstruction> audioInstructions = new HashSet<>();

    @OneToMany(mappedBy = "videoTask", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private Set<TaskPermission> permissions = new HashSet<>();

    // Constructors
    public VideoTask() {
    }

    public VideoTask(String title, String description, User createdBy) {
        this.title = title;
        this.description = description;
        this.createdBy = createdBy;
        this.taskStatus = TaskStatus.DRAFT;
        this.taskPriority = TaskPriority.MEDIUM.MEDIUM;
        this.privacyLevel = PrivacyLevel.ALL;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public VideoTask(String title, String description, String rawVideoUrl,
                     User createdBy, TaskStatus taskStatus, TaskPriority taskPriority, PrivacyLevel privacyLevel) {

        this.title = title;
        this.description = description;
        this.createdBy = createdBy;
        this.taskStatus = TaskStatus.DRAFT;
        this.taskPriority = TaskPriority.MEDIUM.MEDIUM;
        this.privacyLevel = PrivacyLevel.ALL;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
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

    public User getAssignedEditor() {
        return assignedEditor;
    }

    public void setAssignedEditor(User assignedEditor) {
        this.assignedEditor = assignedEditor;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
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

    public List<Revision> getRevisions() {
        return revisions;
    }

    public void setRevisions(List<Revision> revisions) {
        this.revisions = revisions;
    }

    public Set<Comment> getComments() {
        return comments;
    }

    public void setComments(Set<Comment> comments) {
        this.comments = comments;
    }

    public Set<AudioInstruction> getAudioInstructions() {
        return audioInstructions;
    }

    public void setAudioInstructions(Set<AudioInstruction> audioInstructions) {
        this.audioInstructions = audioInstructions;
    }

    public Set<TaskPermission> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<TaskPermission> permissions) {
        this.permissions = permissions;
    }

    public TaskStatus getTaskStatus() {
        return taskStatus;
    }

    public void setTaskStatus(TaskStatus taskStatus) {
        this.taskStatus = taskStatus;
    }

    public TaskPriority getTaskPriority() {
        return taskPriority;
    }

    public void setTaskPriority(TaskPriority taskPriority) {
        this.taskPriority = taskPriority;
    }
}
