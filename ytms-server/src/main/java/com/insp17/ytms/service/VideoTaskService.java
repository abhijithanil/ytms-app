package com.insp17.ytms.service;

import com.insp17.ytms.dtos.AudioInstructionDTO;
import com.insp17.ytms.dtos.TaskUpdateRequest;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class VideoTaskService {

    @Autowired
    private VideoTaskRepository videoTaskRepository;

    @Autowired
    private RawVideoRepository rawVideoRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RevisionRepository revisionRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private AudioInstructionRepository audioInstructionRepository;

    @Autowired
    private TaskPermissionRepository taskPermissionRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private UserService userService;

    public List<VideoTask> getAllTasks() {
        return videoTaskRepository.findAll();
    }

    public List<VideoTask> getVisibleTasksForUser(Long userId) {
        return videoTaskRepository.findVisibleTasksForUser(userId);
    }

    public List<VideoTask> getAccessibleTasksForUser(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getRole() == UserRole.ADMIN) {
            return getAllTasks();
        }
        return videoTaskRepository.findAccessibleTasksForUser(userId, userId);
    }

    public VideoTask getTaskById(Long id) {
        return videoTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
    }

    public Optional<VideoTask> getTaskByIdWithDetails(Long id) {
        return videoTaskRepository.findByIdWithAllDetails(id);
    }

    public VideoTask createTask(VideoTask task) {
        return videoTaskRepository.save(task);
    }

    // NEW: Raw Video Management Methods
    public RawVideo getRawVideoById(Long videoId) {
        return rawVideoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Raw video not found"));
    }

    public List<RawVideo> getRawVideosByTask(Long taskId) {
        return rawVideoRepository.findByVideoTaskIdOrderByCreatedAtAsc(taskId);
    }

    public List<RawVideo> getMainVideosByTask(Long taskId) {
        return rawVideoRepository.findMainVideosByTaskId(taskId);
    }

    public List<RawVideo> getShortVideosByTask(Long taskId) {
        return rawVideoRepository.findShortVideosByTaskId(taskId);
    }

    public Optional<RawVideo> getFirstMainVideo(Long taskId) {
        return rawVideoRepository.findFirstMainVideoByTaskId(taskId);
    }

    public long getRawVideoCount(Long taskId) {
        return rawVideoRepository.countByVideoTaskId(taskId);
    }

    public long getMainVideoCount(Long taskId) {
        return rawVideoRepository.countByVideoTaskIdAndType(taskId, "main");
    }

    public long getShortVideoCount(Long taskId) {
        return rawVideoRepository.countByVideoTaskIdAndType(taskId, "short");
    }

    public RawVideo addRawVideo(Long taskId, String filename, String url, String type, Long size) {
        VideoTask task = getTaskById(taskId);
        RawVideo rawVideo = new RawVideo(task, filename, url, type, size);
        return rawVideoRepository.save(rawVideo);
    }

    public void deleteRawVideo(Long videoId) {
        RawVideo rawVideo = getRawVideoById(videoId);

        // Delete file from storage
        try {
            fileStorageService.deleteFileFromGCP(rawVideo.getUrl());
        } catch (Exception e) {
            System.err.println("Error deleting raw video file from GCP: " + e.getMessage());
        }

        rawVideoRepository.delete(rawVideo);
    }

    public VideoTask assignEditor(Long taskId, Long editorId, User assignedBy) {
        VideoTask task = getTaskById(taskId);
        User oldEditor = task.getAssignedEditor();

        if (editorId == null) {
            task.setAssignedEditor(null);
            return videoTaskRepository.save(task);
        }

        User newEditor = userRepository.findById(editorId)
                .orElseThrow(() -> new RuntimeException("Editor not found"));

        if (newEditor.getRole() != UserRole.EDITOR && newEditor.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("User is not an editor");
        }

        TaskStatus oldStatus = task.getTaskStatus();
        task.setAssignedEditor(newEditor);
        task.setTaskStatus(TaskStatus.ASSIGNED);
        task.setUpdatedAt(LocalDateTime.now());

        VideoTask savedTask = videoTaskRepository.save(task);

        emailService.sendEditorChangedEmail(task, oldEditor, newEditor, assignedBy);
        if (oldStatus != TaskStatus.ASSIGNED) {
            emailService.sendStatusChangeEmail(task, oldStatus, TaskStatus.ASSIGNED, assignedBy);
        }

        return savedTask;
    }

    public VideoTask updateTaskStatus(Long taskId, TaskStatus newStatus, User updatedBy) {
        VideoTask task = getTaskById(taskId);
        TaskStatus oldStatus = task.getTaskStatus();

        if (!isValidStatusTransition(oldStatus, newStatus, updatedBy.getRole())) {
            throw new RuntimeException("Invalid status transition");
        }

        task.setTaskStatus(newStatus);
        task.setUpdatedAt(LocalDateTime.now());

        VideoTask savedTask = videoTaskRepository.save(task);

        emailService.sendStatusChangeEmail(task, oldStatus, newStatus, updatedBy);

        if (newStatus == TaskStatus.READY) {
            emailService.sendTaskReadyForApprovalEmail(task, task.getAssignedEditor());
        }

        return savedTask;
    }

    private boolean isValidStatusTransition(TaskStatus oldStatus, TaskStatus newStatus, UserRole userRole) {
        if (userRole == UserRole.ADMIN) {
            return true;
        }

        if (userRole == UserRole.EDITOR) {
            switch (oldStatus) {
                case ASSIGNED:
                    return newStatus == TaskStatus.IN_PROGRESS;
                case IN_PROGRESS:
                    return newStatus == TaskStatus.READY || newStatus == TaskStatus.REVIEW;
                case REVIEW:
                    return newStatus == TaskStatus.IN_PROGRESS || newStatus == TaskStatus.READY;
                case READY:
                    return newStatus == TaskStatus.IN_PROGRESS;
                default:
                    return false;
            }
        }

        return false;
    }

    public List<VideoTask> getTasksByEditor(Long editorId) {
        return videoTaskRepository.findByAssignedEditorId(editorId);
    }

    public List<VideoTask> getTasksByStatus(TaskStatus status) {
        return videoTaskRepository.findByTaskStatus(status);
    }

    public void setTaskPrivacy(Long taskId, PrivacyLevel privacyLevel, List<Long> userIds) {
        VideoTask task = getTaskById(taskId);
        task.setPrivacyLevel(privacyLevel);
        videoTaskRepository.save(task);

        taskPermissionRepository.deleteByVideoTaskId(taskId);

        if (privacyLevel == PrivacyLevel.SELECTED && userIds != null) {
            for (Long userId : userIds) {
                User user = userRepository.findById(userId).orElse(null);
                if (user != null) {
                    TaskPermission permission = new TaskPermission(task, user, PermissionType.VIEW);
                    taskPermissionRepository.save(permission);
                }
            }
        }
    }

    public boolean canUserAccessTask(Long taskId, User user) {
        VideoTask task = getTaskById(taskId);

        if (user == null) return false;
        Long userId = user.getId();
        if (user.getRole() == UserRole.ADMIN) return true;
        if (task.getCreatedBy().getId().equals(userId)) return true;
        if (task.getAssignedEditor() != null && task.getAssignedEditor().getId().equals(userId)) return true;
        if (task.getPrivacyLevel() == PrivacyLevel.ALL) return true;

        return taskPermissionRepository.existsByVideoTaskIdAndUserIdAndPermissionType(taskId, userId, PermissionType.VIEW);
    }

    public boolean canUserDownloadTaskFiles(Long taskId, Long userId) {
        VideoTask task = getTaskById(taskId);
        User user = userRepository.findById(userId).orElse(null);

        if (user == null) return false;
        if (user.getRole() == UserRole.ADMIN) return true;
        if (task.getCreatedBy().getId().equals(userId)) return true;
        if (task.getAssignedEditor() != null && task.getAssignedEditor().getId().equals(userId)) return true;

        return taskPermissionRepository.existsByVideoTaskIdAndUserIdAndPermissionType(taskId, userId, PermissionType.DOWNLOAD);
    }

    public void scheduleYouTubeUpload(Long taskId, LocalDateTime uploadTime) {
        VideoTask task = getTaskById(taskId);
        task.setYoutubeUploadTime(uploadTime);
        task.setTaskStatus(TaskStatus.SCHEDULED);
        videoTaskRepository.save(task);
    }

    public List<VideoTask> getScheduledTasksForUpload() {
        return videoTaskRepository.findScheduledTasksForUpload(LocalDateTime.now());
    }

    public AudioInstruction addAudioInstruction(AudioInstructionDTO audioInstructionDTO, User uploadedBy) throws IOException {
        VideoTask task = getTaskById(audioInstructionDTO.getVideoTaskId());

        if (task == null) {
            throw new RuntimeException("Task not found");
        }

        AudioInstruction audioInstruction = new AudioInstruction();
        audioInstruction.setAudioUrl(audioInstructionDTO.getAudioUrl());
        audioInstruction.setVideoTask(task);
        audioInstruction.setUploadedBy(uploadedBy);
        audioInstruction.setDescription(audioInstructionDTO.getDescription());
        audioInstruction.setAudioFilename(audioInstructionDTO.getAudioFilename());

        return audioInstructionRepository.save(audioInstruction);
    }

    public List<AudioInstruction> getAudioInstructions(Long taskId) {
        return audioInstructionRepository.findByVideoTaskIdOrderByCreatedAtAsc(taskId);
    }

    public DashboardStats getDashboardStats(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        DashboardStats stats = new DashboardStats();

        if (user.getRole() == UserRole.ADMIN) {
            stats.setTotalTasks(videoTaskRepository.count());
            stats.setInProgress(videoTaskRepository.countByTaskStatus(TaskStatus.IN_PROGRESS));
            stats.setReadyToUpload(videoTaskRepository.countByTaskStatus(TaskStatus.READY));
            stats.setCompleted(videoTaskRepository.countByTaskStatus(TaskStatus.UPLOADED));
        } else {
            List<VideoTask> userTasks = getAccessibleTasksForUser(userId);
            stats.setTotalTasks(userTasks.size());
            stats.setInProgress(userTasks.stream().mapToInt(task -> task.getTaskStatus() == TaskStatus.IN_PROGRESS ? 1 : 0).sum());
            stats.setReadyToUpload(userTasks.stream().mapToInt(task -> task.getTaskStatus() == TaskStatus.READY ? 1 : 0).sum());
            stats.setCompleted(userTasks.stream().mapToInt(task -> task.getTaskStatus() == TaskStatus.UPLOADED ? 1 : 0).sum());
        }

        return stats;
    }

    public List<VideoTask> getRecentTasks(Long userId) {
        if (userRepository.findById(userId).orElseThrow().getRole() == UserRole.ADMIN) {
            return videoTaskRepository.findTop10ByOrderByCreatedAtDesc();
        } else {
            return getAccessibleTasksForUser(userId).stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .limit(10)
                    .toList();
        }
    }

    public void deleteTask(Long id) {
        VideoTask videoTask = videoTaskRepository.findById(id).orElseThrow(() -> new RuntimeException("Video not found"));

        // Delete legacy single video file
        if (videoTask.getRawVideoUrl() != null) {
            fileStorageService.deleteFileFromGCP(videoTask.getRawVideoUrl());
        }

        // Delete all raw videos
        videoTask.getRawVideos().forEach(rawVideo -> {
            fileStorageService.deleteFileFromGCP(rawVideo.getUrl());
        });

        // Delete revision files
        videoTask.getRevisions().forEach(revision -> {
            fileStorageService.deleteFileFromGCP(revision.getEditedVideoUrl());
        });

        // Delete audio instruction files
        videoTask.getAudioInstructions().forEach(audioInstruction -> {
            fileStorageService.deleteFileFromGCP(audioInstruction.getAudioUrl());
        });

        videoTaskRepository.deleteById(id);
    }

    public VideoTask updateTask(Long id, TaskUpdateRequest taskUpdateRequest) {
        VideoTask videoTask = videoTaskRepository.findById(id).orElseThrow(() -> new RuntimeException("Video not found"));
        boolean hasModificationItem = false;

        if (taskUpdateRequest.getDeadline() != null && !taskUpdateRequest.getDeadline().isEmpty()) {
            Instant instant = Instant.parse(taskUpdateRequest.getDeadline());
            videoTask.setDeadline(LocalDateTime.ofInstant(instant, ZoneOffset.UTC));
            hasModificationItem = true;
        }

        if (taskUpdateRequest.getPriority() != null) {
            videoTask.setTaskPriority(taskUpdateRequest.getPriority());
            hasModificationItem = true;
        }

        if (taskUpdateRequest.getTitle() != null) {
            videoTask.setTitle(taskUpdateRequest.getTitle());
            hasModificationItem = true;
        }

        if (taskUpdateRequest.getDescription() != null) {
            videoTask.setDescription(taskUpdateRequest.getDescription());
            hasModificationItem = true;
        }

        if (taskUpdateRequest.getPrivacyLevel() != null) {
            videoTask.setPrivacyLevel(taskUpdateRequest.getPrivacyLevel());
            hasModificationItem = true;
        }

        if (hasModificationItem) {
            videoTask.setUpdatedAt(LocalDateTime.now());
            VideoTask task = videoTaskRepository.save(videoTask);
            return task;
        }

        return videoTask;
    }

    public void updateTaskStatus(Long taskId, String youtubeVideoId, Long updatedByUserId, TaskStatus taskStatus) {
        VideoTask task = getTaskById(taskId);
        User updatedBy = userService.getUserByIdPrivateUse(updatedByUserId);

        task.setYoutubeVideoId(youtubeVideoId);
        updateTaskStatus(taskId, taskStatus, updatedBy);
    }

    // NEW: Check if task has videos ready for upload
    public boolean hasVideosReadyForUpload(Long taskId) {
        List<Revision> revisions = revisionRepository.findByVideoTaskIdOrderByRevisionNumberDesc(taskId);
        List<RawVideo> rawVideos = rawVideoRepository.findByVideoTaskIdOrderByCreatedAtAsc(taskId);
        return !revisions.isEmpty() || !rawVideos.isEmpty();
    }

    // NEW: Get videos suitable for YouTube upload (both revisions and raw videos)
    public List<Revision> getRevisionsForYouTubeUpload(Long taskId) {
        return revisionRepository.findByVideoTaskIdOrderByRevisionNumberDesc(taskId);
    }

    public boolean canUserAccessRevision(Long revisionId, User user) {
        Revision revision = revisionRepository.findById(revisionId).orElseThrow(() -> new RuntimeException("Revision doesn't exist"));
        VideoTask task = getTaskById(revision.getVideoTask().getId());

        if (user == null) return false;
        Long userId = user.getId();
        if (user.getRole() == UserRole.ADMIN) return true;
        if (task.getCreatedBy().getId().equals(userId)) return true;
        if (task.getAssignedEditor() != null && task.getAssignedEditor().getId().equals(userId)) return true;
        if (task.getPrivacyLevel() == PrivacyLevel.ALL) return true;

        return taskPermissionRepository.existsByVideoTaskIdAndUserIdAndPermissionType(task.getId(), userId, PermissionType.VIEW);
    }

    public static class DashboardStats {
        private long totalTasks;
        private long inProgress;
        private long readyToUpload;
        private long completed;

        // Getters and setters
        public long getTotalTasks() {
            return totalTasks;
        }

        public void setTotalTasks(long totalTasks) {
            this.totalTasks = totalTasks;
        }

        public long getInProgress() {
            return inProgress;
        }

        public void setInProgress(long inProgress) {
            this.inProgress = inProgress;
        }

        public long getReadyToUpload() {
            return readyToUpload;
        }

        public void setReadyToUpload(long readyToUpload) {
            this.readyToUpload = readyToUpload;
        }

        public long getCompleted() {
            return completed;
        }

        public void setCompleted(long completed) {
            this.completed = completed;
        }
    }
}