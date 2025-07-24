package com.insp17.ytms.service;

import com.insp17.ytms.dtos.AudioInstructionDTO;
import com.insp17.ytms.dtos.CreateTaskRequest;
import com.insp17.ytms.dtos.RawVideoDto;
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
    private RawVideoRepository rawVideoRepository;

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

    // Enhanced task creation with multiple raw videos support
    public VideoTask createTask(CreateTaskRequest createTaskRequest, User creator) {
        VideoTask task = new VideoTask(createTaskRequest.getTitle(), createTaskRequest.getDescription(), creator);

        task.setTaskPriority(createTaskRequest.getPriority());
        task.setPrivacyLevel(createTaskRequest.getPrivacyLevel());

        if (createTaskRequest.getDeadline() != null && !createTaskRequest.getDeadline().isEmpty()) {
            task.setDeadline(LocalDateTime.parse(createTaskRequest.getDeadline()));
        }

        if (createTaskRequest.getAssignedEditorId() != null) {
            User editor = userRepository.findById(createTaskRequest.getAssignedEditorId())
                    .orElseThrow(() -> new RuntimeException("Editor not found"));
            task.setAssignedEditor(editor);
            task.setTaskStatus(TaskStatus.ASSIGNED);
        }

        // Legacy single video support (backward compatibility)
        if (createTaskRequest.getRawVideoUrl() != null && !createTaskRequest.getRawVideoUrl().isEmpty()) {
            task.setRawVideoUrl(createTaskRequest.getRawVideoUrl());
            task.setRawVideoFilename(createTaskRequest.getRawVideoFilename());
        }

        VideoTask savedTask = videoTaskRepository.save(task);

        // NEW: Handle multiple raw videos
        if (createTaskRequest.getRawVideos() != null && !createTaskRequest.getRawVideos().isEmpty()) {
            for (RawVideoDto rawVideoDto : createTaskRequest.getRawVideos()) {
                RawVideo rawVideo = new RawVideo(
                        savedTask,
                        rawVideoDto.getVideoUrl(),
                        rawVideoDto.getFilename(),
                        rawVideoDto.getFileSize(),
                        rawVideoDto.getOrder(),
                        rawVideoDto.getDescription(),
                        creator
                );
                rawVideoRepository.save(rawVideo);
            }
        }

        // Handle privacy settings
        if (createTaskRequest.getPrivacyLevel() == PrivacyLevel.SELECTED && createTaskRequest.getUserIds() != null) {
            setTaskPrivacy(savedTask.getId(), PrivacyLevel.SELECTED, createTaskRequest.getUserIds());
        }

        return savedTask;
    }

    // Legacy method - keeping for backward compatibility
    public VideoTask createTask(VideoTask task) {
        return videoTaskRepository.save(task);
    }

    // NEW: Add raw video to existing task
    public RawVideo addRawVideoToTask(Long taskId, String videoUrl, String filename, Long fileSize,
                                      String description, User uploadedBy) {
        VideoTask task = getTaskById(taskId);

        // Determine the next order number
        Optional<Integer> maxOrder = rawVideoRepository.findMaxVideoOrderByTaskId(taskId);
        int nextOrder = maxOrder.orElse(0) + 1;

        // Account for legacy raw video
        if (task.getRawVideoUrl() != null) {
            nextOrder++;
        }

        RawVideo rawVideo = new RawVideo(task, videoUrl, filename, fileSize, nextOrder, description, uploadedBy);
        return rawVideoRepository.save(rawVideo);
    }

    // NEW: Get raw videos for task
    public List<RawVideo> getRawVideosForTask(Long taskId) {
        return rawVideoRepository.findByVideoTaskIdOrderByVideoOrderAsc(taskId);
    }

    // NEW: Delete raw video
    public void deleteRawVideo(Long rawVideoId, User user) {
        RawVideo rawVideo = rawVideoRepository.findById(rawVideoId)
                .orElseThrow(() -> new RuntimeException("Raw video not found"));

        // Check permissions
        if (!canUserAccessTask(rawVideo.getVideoTask().getId(), user)) {
            throw new RuntimeException("Access denied");
        }

        if (user.getRole() != UserRole.ADMIN && !rawVideo.getUploadedBy().getId().equals(user.getId())) {
            throw new RuntimeException("Only the uploader or admin can delete this video");
        }

        // Delete file from storage
        fileStorageService.deleteFileFromGCP(rawVideo.getVideoUrl());

        rawVideoRepository.deleteById(rawVideoId);
    }

    // NEW: Update raw video
    public RawVideo updateRawVideo(Long rawVideoId, String description, Integer order, User user) {
        RawVideo rawVideo = rawVideoRepository.findById(rawVideoId)
                .orElseThrow(() -> new RuntimeException("Raw video not found"));

        // Check permissions
        if (!canUserAccessTask(rawVideo.getVideoTask().getId(), user)) {
            throw new RuntimeException("Access denied");
        }

        if (user.getRole() != UserRole.ADMIN && !rawVideo.getUploadedBy().getId().equals(user.getId())) {
            throw new RuntimeException("Only the uploader or admin can update this video");
        }

        if (description != null) {
            rawVideo.setDescription(description);
        }

        if (order != null) {
            rawVideo.setVideoOrder(order);
        }

        return rawVideoRepository.save(rawVideo);
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

    // NEW: Check if user can access specific raw video
    public boolean canUserAccessRawVideo(Long rawVideoId, User user) {
        RawVideo rawVideo = rawVideoRepository.findById(rawVideoId)
                .orElseThrow(() -> new RuntimeException("Raw video not found"));

        return canUserAccessTask(rawVideo.getVideoTask().getId(), user);
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
        audioInstruction.setAudioFilename(audioInstruction.getAudioFilename());

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

        // Delete legacy raw video
        if (videoTask.getRawVideoUrl() != null) {
            fileStorageService.deleteFileFromGCP(videoTask.getRawVideoUrl());
        }

        // Delete new raw videos
        List<RawVideo> rawVideos = rawVideoRepository.findByVideoTaskIdOrderByCreatedAtAsc(id);
        rawVideos.forEach(rawVideo -> fileStorageService.deleteFileFromGCP(rawVideo.getVideoUrl()));

        // Delete revisions and audio instructions
        videoTask.getRevisions().forEach(e -> fileStorageService.deleteFileFromGCP(e.getEditedVideoUrl()));
        videoTask.getAudioInstructions().forEach(e -> fileStorageService.deleteFileFromGCP(e.getAudioUrl()));

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

    // NEW: Enhanced methods for multiple video support

    /**
     * Get all videos (raw videos + revisions) for a task with proper ordering
     */
    public TaskVideosInfo getTaskVideosInfo(Long taskId) {
        VideoTask task = getTaskById(taskId);
        List<RawVideo> rawVideos = getRawVideosForTask(taskId);
        List<Revision> revisions = revisionRepository.findByVideoTaskIdOrderByRevisionNumberDesc(taskId);

        return new TaskVideosInfo(task, rawVideos, revisions);
    }

    /**
     * Check if task has any videos available
     */
    public boolean taskHasVideos(Long taskId) {
        VideoTask task = getTaskById(taskId);

        // Check legacy raw video
        if (task.getRawVideoUrl() != null && !task.getRawVideoUrl().isEmpty()) {
            return true;
        }

        // Check new raw videos
        long rawVideoCount = rawVideoRepository.countByVideoTaskId(taskId);
        if (rawVideoCount > 0) {
            return true;
        }

        // Check revisions
        return !task.getRevisions().isEmpty();
    }

    /**
     * Get video count summary for task
     */
    public VideoCountSummary getVideoCountSummary(Long taskId) {
        VideoTask task = getTaskById(taskId);
        long rawVideoCount = rawVideoRepository.countByVideoTaskId(taskId);
        long revisionCount = task.getRevisions().size();

        // Add legacy raw video to count
        if (task.getRawVideoUrl() != null) {
            rawVideoCount++;
        }

        return new VideoCountSummary(rawVideoCount, revisionCount, rawVideoCount + revisionCount);
    }

    /**
     * Reorder raw videos for a task
     */
    public void reorderRawVideos(Long taskId, List<Long> rawVideoIds, User user) {
        if (!canUserAccessTask(taskId, user)) {
            throw new RuntimeException("Access denied");
        }

        for (int i = 0; i < rawVideoIds.size(); i++) {
            Long rawVideoId = rawVideoIds.get(i);
            RawVideo rawVideo = rawVideoRepository.findById(rawVideoId)
                    .orElseThrow(() -> new RuntimeException("Raw video not found: " + rawVideoId));

            if (!rawVideo.getVideoTask().getId().equals(taskId)) {
                throw new RuntimeException("Raw video does not belong to this task");
            }

            rawVideo.setVideoOrder(i + 1);
            rawVideoRepository.save(rawVideo);
        }
    }

    // Inner classes for structured data return
    public static class TaskVideosInfo {
        private final VideoTask task;
        private final List<RawVideo> rawVideos;
        private final List<Revision> revisions;

        public TaskVideosInfo(VideoTask task, List<RawVideo> rawVideos, List<Revision> revisions) {
            this.task = task;
            this.rawVideos = rawVideos;
            this.revisions = revisions;
        }

        public VideoTask getTask() { return task; }
        public List<RawVideo> getRawVideos() { return rawVideos; }
        public List<Revision> getRevisions() { return revisions; }

        public boolean hasLegacyRawVideo() {
            return task.getRawVideoUrl() != null && !task.getRawVideoUrl().isEmpty();
        }

        public int getTotalVideoCount() {
            int count = rawVideos.size() + revisions.size();
            if (hasLegacyRawVideo()) count++;
            return count;
        }
    }

    public static class VideoCountSummary {
        private final long rawVideoCount;
        private final long revisionCount;
        private final long totalCount;

        public VideoCountSummary(long rawVideoCount, long revisionCount, long totalCount) {
            this.rawVideoCount = rawVideoCount;
            this.revisionCount = revisionCount;
            this.totalCount = totalCount;
        }

        public long getRawVideoCount() { return rawVideoCount; }
        public long getRevisionCount() { return revisionCount; }
        public long getTotalCount() { return totalCount; }
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