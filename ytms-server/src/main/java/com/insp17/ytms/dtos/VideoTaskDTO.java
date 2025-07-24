package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.VideoTask;
import com.insp17.ytms.entity.RawVideo;
import com.insp17.ytms.entity.Revision;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
public class VideoTaskDTO {
    private Long id;
    private String title;
    private String description;
    private String status;
    private String priority;
    private String privacyLevel;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deadline;
    private UserDTO createdBy;
    private UserDTO assignedEditor;

    // Legacy single video support (for backward compatibility)
    private String rawVideoUrl;
    private String rawVideoFilename;

    // Enhanced multiple video support
    private List<RawVideoDTO> rawVideos;
    private List<RawVideoDTO> mainVideos;
    private List<RawVideoDTO> shortVideos;

    // Revision support with types
    private List<RevisionDTO> revisions;
    private List<RevisionDTO> mainRevisions;
    private List<RevisionDTO> shortRevisions;

    private List<CommentDTO> comments;
    private List<AudioInstructionDTO> audioInstructions;
    private List<String> tags;
    private Integer totalRevisions;
    private Integer totalRawVideos;
    private Integer totalMainVideos;
    private Integer totalShortVideos;

    public VideoTaskDTO() {}

    public VideoTaskDTO(VideoTask task) {
        this.id = task.getId();
        this.title = task.getTitle();
        this.description = task.getDescription();
        this.status = task.getTaskStatus() != null ? task.getTaskStatus().name() : null;
        this.priority = task.getTaskPriority() != null ? task.getTaskPriority().name() : null;
        this.privacyLevel = task.getPrivacyLevel() != null ? task.getPrivacyLevel().name() : null;
        this.createdAt = task.getCreatedAt();
        this.updatedAt = task.getUpdatedAt();
        this.deadline = task.getDeadline();
        this.createdBy = task.getCreatedBy() != null ? new UserDTO(task.getCreatedBy()) : null;
        this.assignedEditor = task.getAssignedEditor() != null ? new UserDTO(task.getAssignedEditor()) : null;

        // Legacy support
        this.rawVideoUrl = task.getRawVideoUrl();
        this.rawVideoFilename = task.getRawVideoFilename();

        // Enhanced multiple video support
        if (task.getRawVideos() != null) {
            this.rawVideos = task.getRawVideos().stream()
                    .map(RawVideoDTO::new)
                    .collect(Collectors.toList());

            // Separate by type
            this.mainVideos = this.rawVideos.stream()
                    .filter(v -> "main".equals(v.getType()))
                    .collect(Collectors.toList());

            this.shortVideos = this.rawVideos.stream()
                    .filter(v -> "short".equals(v.getType()))
                    .collect(Collectors.toList());

            this.totalRawVideos = this.rawVideos.size();
            this.totalMainVideos = this.mainVideos.size();
            this.totalShortVideos = this.shortVideos.size();
        }

        // Enhanced revision support
        if (task.getRevisions() != null) {
            this.revisions = task.getRevisions().stream()
                    .map(RevisionDTO::new)
                    .collect(Collectors.toList());

            // Separate revisions by type if type field exists
            this.mainRevisions = this.revisions.stream()
                    .filter(r -> "main".equals(r.getType()) || r.getType() == null) // null defaults to main
                    .collect(Collectors.toList());

            this.shortRevisions = this.revisions.stream()
                    .filter(r -> "short".equals(r.getType()))
                    .collect(Collectors.toList());

            this.totalRevisions = this.revisions.size();
        }

        // Comments and audio instructions
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

        // Tags support
        if (task.getTags() != null) {
            this.tags = List.copyOf(task.getTags());
        }
    }
}