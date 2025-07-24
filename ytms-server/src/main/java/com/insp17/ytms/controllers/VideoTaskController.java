package com.insp17.ytms.controllers;

import com.google.api.services.youtube.model.Video;
import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.service.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.text.MessageFormat;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class VideoTaskController {

    @Autowired
    private VideoTaskService videoTaskService;

    @Autowired
    private UserService userService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private CommentService commentService;

    @Autowired
    private AudioInstructionService audioInstructionService;

    @Autowired
    private VideoMetadataService videoMetadataService;

    @Autowired
    private YouTubeService youTubeService;

    @Autowired
    private YouTubeChannelService youTubeChannelService;

    @Autowired
    private YouTubeAccountService youTubeAccountService;

    @GetMapping
    public ResponseEntity<List<VideoTaskDTO>> getAllTasks(@CurrentUser UserPrincipal userPrincipal) {
        List<VideoTask> tasks = videoTaskService.getAccessibleTasksForUser(userPrincipal.getId());
        List<VideoTaskDTO> taskDTOs = tasks.stream().map(VideoTaskDTO::new).collect(Collectors.toList());
        return ResponseEntity.ok(taskDTOs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VideoTaskDTO> getTaskById(@PathVariable Long id, @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
        if (!videoTaskService.canUserAccessTask(id, user)) {
            return ResponseEntity.status(403).build();
        }
        VideoTask task = videoTaskService.getTaskByIdWithDetails(id).orElseThrow();
        return ResponseEntity.ok(new VideoTaskDTO(task));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Boolean>> deleteTaskById(@PathVariable Long id, @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
        if (!videoTaskService.canUserAccessTask(id, user)) {
            return ResponseEntity.status(403).build();
        }

        videoTaskService.deleteTask(id);
        Map<String, Boolean> response = new HashMap<>();
        response.put("deleteStatus", true);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<VideoTaskDTO> createTask(@RequestBody CreateTaskRequest createTaskRequest, @CurrentUser UserPrincipal userPrincipal) {
        try {
            User creator = userService.getUserByIdPrivateUse(userPrincipal.getId());
            VideoTask task = new VideoTask(createTaskRequest.getTitle(), createTaskRequest.getDescription(), creator);

            task.setTaskPriority(createTaskRequest.getPriority());
            task.setPrivacyLevel(createTaskRequest.getPrivacyLevel());

            if (createTaskRequest.getDeadline() != null && !createTaskRequest.getDeadline().isEmpty()) {
                task.setDeadline(LocalDateTime.parse(createTaskRequest.getDeadline()));
            }

            if (createTaskRequest.getAssignedEditorId() != null) {
                User editor = userService.getUserByIdPrivateUse(createTaskRequest.getAssignedEditorId());
                task.setAssignedEditor(editor);
                task.setTaskStatus(TaskStatus.ASSIGNED);
            }

            // Handle legacy single video (backward compatibility)
            if (createTaskRequest.getRawVideoUrl() != null && !createTaskRequest.getRawVideoUrl().isEmpty()) {
                task.setRawVideoUrl(createTaskRequest.getRawVideoUrl());
                task.setRawVideoFilename(createTaskRequest.getRawVideoFilename());
            }

            // Handle multiple raw videos (NEW)
            if (createTaskRequest.getRawVideos() != null && !createTaskRequest.getRawVideos().isEmpty()) {
                for (CreateTaskRequest.RawVideoInfo videoInfo : createTaskRequest.getRawVideos()) {
                    RawVideo rawVideo = new RawVideo(
                            task,
                            videoInfo.getFilename(),
                            videoInfo.getUrl(),
                            videoInfo.getType() != null ? videoInfo.getType() : "main",
                            videoInfo.getSize()
                    );
                    task.addRawVideo(rawVideo);
                }
            }

            VideoTask createdTask = videoTaskService.createTask(task);

            if (createTaskRequest.getPrivacyLevel() == PrivacyLevel.SELECTED && createTaskRequest.getUserIds() != null) {
                videoTaskService.setTaskPrivacy(createdTask.getId(), PrivacyLevel.SELECTED, createTaskRequest.getUserIds());
            }

            if (createTaskRequest.getComments() != null && !(createTaskRequest.getComments().isEmpty())) {
                createTaskRequest.getComments().forEach(comment -> commentService.addComment(createdTask.getId(), comment, creator));
            }

            if (createTaskRequest.getAudioInstructionUrls() != null && !(createTaskRequest.getAudioInstructionUrls().isEmpty())) {
                createTaskRequest.getAudioInstructionUrls().forEach(instructionUrl -> {
                    AudioInstruction audioInstruction = new AudioInstruction();
                    audioInstruction.setVideoTask(createdTask);
                    audioInstruction.setUploadedBy(creator);
                    audioInstruction.setAudioUrl(instructionUrl);
                    audioInstructionService.addInstruction(audioInstruction);
                });
            }

            return ResponseEntity.ok(new VideoTaskDTO(createdTask));

        } catch (Exception e) {
            log.error("Failed to create task", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/generate-upload-url")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<?> generateUploadUrl(@RequestParam("filename") String filename, @RequestParam("type") String type, @RequestParam("folder") String folder) {
        try {
            String uniqueFilename = fileStorageService.generateUniqueFilename(filename);

            String objectName = folder + "/" + uniqueFilename;
            String signedUrl = "";
            if (folder.equals("thumbnails")) {
                signedUrl = fileStorageService.generateImageUploadUrl(objectName, type);
            } else {
                signedUrl = fileStorageService.generateResumableUploadUrl(objectName, type);
            }

            Map<String, String> response = new HashMap<>();
            response.put("signedUrl", signedUrl);
            response.put("objectName", objectName);
            response.put("fileName", uniqueFilename);
            System.out.println(response);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not generate upload URL: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VideoTaskDTO> updateTask(@PathVariable Long id, @RequestBody TaskUpdateRequest taskUpdateRequest, @CurrentUser UserPrincipal userPrincipal) {
        User assignedBy = userService.getUserByIdPrivateUse(userPrincipal.getId());
        if (assignedBy.getRole() != UserRole.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        VideoTask task = videoTaskService.updateTask(id, taskUpdateRequest);
        return ResponseEntity.ok(new VideoTaskDTO(task));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VideoTaskDTO> assignEditor(@PathVariable Long id, @RequestBody AssignEditorRequest request, @CurrentUser UserPrincipal userPrincipal) {
        User assignedBy = userService.getUserByIdPrivateUse(userPrincipal.getId());
        VideoTask task = videoTaskService.assignEditor(id, request.getEditorId(), assignedBy);
        return ResponseEntity.ok(new VideoTaskDTO(task));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<VideoTaskDTO> updateStatus(@PathVariable Long id, @RequestBody UpdateStatusRequest request, @CurrentUser UserPrincipal userPrincipal) {
        User updatedBy = userService.getUserByIdPrivateUse(userPrincipal.getId());
        VideoTask task = videoTaskService.updateTaskStatus(id, request.getStatus(), updatedBy);
        return ResponseEntity.ok(new VideoTaskDTO(task));
    }

    @PostMapping("/{id}/privacy")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> setTaskPrivacy(@PathVariable Long id, @RequestBody TaskPrivacyRequest request) {
        videoTaskService.setTaskPrivacy(id, request.getPrivacyLevel(), request.getUserIds());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/schedule-upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> scheduleYouTubeUpload(@PathVariable Long id, @RequestBody ScheduleUploadRequest request) {
        videoTaskService.scheduleYouTubeUpload(id, request.getUploadTime());
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    @PostMapping("/{id}/audio-instructions")
    public ResponseEntity<AudioInstructionDTO> addAudioInstruction(@RequestBody AudioInstructionDTO audioInstructionDTO, @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

        try {
            if (!videoTaskService.canUserAccessTask(audioInstructionDTO.getVideoTaskId(), user)) {
                return ResponseEntity.status(403).build();
            }

            AudioInstruction audioInstruction = videoTaskService.addAudioInstruction(audioInstructionDTO, user);
            return ResponseEntity.ok(new AudioInstructionDTO(audioInstruction));

        } catch (IOException e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}/audio-instructions")
    public ResponseEntity<List<AudioInstructionDTO>> getAudioInstructions(@PathVariable Long id, @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
        if (!videoTaskService.canUserAccessTask(id, user)) {
            return ResponseEntity.status(403).build();
        }
        List<AudioInstruction> audioInstructions = videoTaskService.getAudioInstructions(id);
        List<AudioInstructionDTO> audioDTOs = audioInstructions.stream().map(AudioInstructionDTO::new).collect(Collectors.toList());
        return ResponseEntity.ok(audioDTOs);
    }

    @DeleteMapping("/audio-instructions/{audioInstructionId}/delete")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<Void> deleteAudioInstruction(@PathVariable Long audioInstructionId, @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
        AudioInstruction audioInstruction = audioInstructionService.getAudioInstructionById(audioInstructionId);
        if (!videoTaskService.canUserAccessTask(audioInstruction.getVideoTask().getId(), user)) {
            return ResponseEntity.status(403).build();
        }
        if (user.getId() == audioInstruction.getUploadedBy().getId() || user.getRole() == UserRole.ADMIN) {
            audioInstructionService.deleteInstruction(audioInstructionId);
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/editor/{editorId}")
    public ResponseEntity<List<VideoTaskDTO>> getTasksByEditor(@PathVariable Long editorId) {
        List<VideoTask> tasks = videoTaskService.getTasksByEditor(editorId);
        List<VideoTaskDTO> taskDTOs = tasks.stream().map(VideoTaskDTO::new).collect(Collectors.toList());
        return ResponseEntity.ok(taskDTOs);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<VideoTaskDTO>> getTasksByStatus(@PathVariable TaskStatus status) {
        List<VideoTask> tasks = videoTaskService.getTasksByStatus(status);
        List<VideoTaskDTO> taskDTOs = tasks.stream().map(VideoTaskDTO::new).collect(Collectors.toList());
        return ResponseEntity.ok(taskDTOs);
    }

    @GetMapping("/{id}/video-url")
    public ResponseEntity<Map<String, String>> getTaskVideoUrl(@PathVariable Long id, @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
        if (!videoTaskService.canUserAccessTask(id, user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        VideoTask task = videoTaskService.getTaskById(id);
        if (task.getRawVideoUrl() == null) {
            return ResponseEntity.notFound().build();
        }

        String objectName = task.getRawVideoUrl().replace("gs://" + fileStorageService.getGcpBucketName() + "/", "");
        String signedUrl = fileStorageService.generateSignedUrlForDownload(objectName);

        Map<String, String> response = new HashMap<>();
        response.put("url", signedUrl);
        response.put("objectName", objectName);

        return ResponseEntity.ok(response);
    }

    // NEW: Get specific raw video URL
    @GetMapping("/{id}/raw-video/{videoId}/video-url")
    public ResponseEntity<Map<String, String>> getRawVideoUrl(@PathVariable Long id, @PathVariable Long videoId, @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
        if (!videoTaskService.canUserAccessTask(id, user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        RawVideo rawVideo = videoTaskService.getRawVideoById(videoId);
        if (rawVideo == null || !rawVideo.getVideoTask().getId().equals(id)) {
            return ResponseEntity.notFound().build();
        }

        String objectName = rawVideo.getUrl().replace("gs://" + fileStorageService.getGcpBucketName() + "/", "");
        String signedUrl = fileStorageService.generateSignedUrlForDownload(objectName);

        Map<String, String> response = new HashMap<>();
        response.put("url", signedUrl);
        response.put("objectName", objectName);

        return ResponseEntity.ok(response);
    }

    // Legacy single video upload (kept for backward compatibility)
    @PostMapping("/upload-to-youtube")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> uploadToYouTube(@RequestBody UploadVideoRequest uploadVideoRequest, @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
        if (!videoTaskService.canUserAccessTask(uploadVideoRequest.getVideoId(), user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            VideoTask task = videoTaskService.getTaskByIdWithDetails(uploadVideoRequest.getVideoId()).orElseThrow(() -> new RuntimeException("Task not found."));
            if (task.getTaskStatus() != TaskStatus.READY) {
                return ResponseEntity.badRequest().body(Map.of("message", "Task is not in READY status."));
            }

            YouTubeChannel channel = youTubeChannelService.getChannelById(uploadVideoRequest.getChannelId()).orElseThrow(() -> new RuntimeException("Channel doesn't exist"));

            if (!youTubeChannelService.canUserAccessChannel(uploadVideoRequest.getChannelId(), user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You don't have access to this channel"));
            }

            if (!youTubeAccountService.isAccountConnected(channel.getYoutubeChannelOwnerEmail())) {
                return ResponseEntity.badRequest().body(Map.of("message", "YouTube account not connected. Please connect the account first.", "accountEmail", channel.getYoutubeChannelOwnerEmail()));
            }

            youTubeService.uploadVideo(task, channel, uploadVideoRequest, user);
            videoTaskService.updateTaskStatus(task.getId(), TaskStatus.UPLOADING, user);
            return ResponseEntity.ok(Map.of("message", "Uploading to YouTube initiated!"));

        } catch (Exception e) {
            log.error("YouTube upload failed for task {}: {}", uploadVideoRequest.getVideoId(), e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", e.getMessage()));
        }
    }

    // NEW: Multiple video upload support
    @PostMapping("/upload-multiple-to-youtube")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> uploadMultipleToYouTube(@RequestBody MultiVideoUploadRequest uploadRequest, @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
        if (!videoTaskService.canUserAccessTask(uploadRequest.getTaskId(), user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            VideoTask task = videoTaskService.getTaskByIdWithDetails(uploadRequest.getTaskId()).orElseThrow(() -> new RuntimeException("Task not found."));
            if (task.getTaskStatus() != TaskStatus.READY) {
                return ResponseEntity.badRequest().body(Map.of("message", "Task is not in READY status."));
            }

            // Validate all uploads
            for (MultiVideoUploadRequest.VideoUploadItem uploadItem : uploadRequest.getUploads()) {
                YouTubeChannel channel = youTubeChannelService.getChannelById(uploadItem.getChannelId())
                        .orElseThrow(() -> new RuntimeException("Channel doesn't exist: " + uploadItem.getChannelId()));

                if (!youTubeChannelService.canUserAccessChannel(uploadItem.getChannelId(), user)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "You don't have access to channel: " + channel.getChannelName()));
                }

                if (!youTubeAccountService.isAccountConnected(channel.getYoutubeChannelOwnerEmail())) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("message", "YouTube account not connected: " + channel.getYoutubeChannelOwnerEmail()));
                }
            }

            // Start multiple uploads
            youTubeService.uploadMultipleVideos(task, uploadRequest.getUploads(), user);
            videoTaskService.updateTaskStatus(task.getId(), TaskStatus.UPLOADING, user);

            return ResponseEntity.ok(Map.of(
                    "message", "Multiple video uploads to YouTube initiated!",
                    "uploadCount", uploadRequest.getUploads().size()
            ));

        } catch (Exception e) {
            log.error("Multiple YouTube upload failed for task {}: {}", uploadRequest.getTaskId(), e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{taskId}/available-channels")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<Map<String, Object>> getAvailableChannelsForTask(@PathVariable Long taskId, @CurrentUser UserPrincipal userPrincipal) {
        User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

        if (!videoTaskService.canUserAccessTask(taskId, user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            Map<String, List<YouTubeChannel>> groupedChannels = youTubeChannelService.getChannelsGroupedByOwner(userPrincipal.getId());

            Map<String, List<Map<String, Object>>> availableChannels = new HashMap<>();

            for (Map.Entry<String, List<YouTubeChannel>> entry : groupedChannels.entrySet()) {
                String accountEmail = entry.getKey();

                if (youTubeAccountService.isAccountConnected(accountEmail)) {
                    List<Map<String, Object>> channelList = entry.getValue().stream().map(channel -> Map.<String, Object>of(
                            "id", channel.getId(),
                            "name", channel.getChannelName(),
                            "channelId", channel.getChannelId(),
                            "thumbnailUrl", channel.getThumbnailUrl()
                    )).collect(Collectors.toList());

                    availableChannels.put(accountEmail, channelList);
                }
            }

            return ResponseEntity.ok(Map.of("taskId", taskId, "availableChannels", availableChannels));

        } catch (Exception e) {
            log.error("Error fetching available channels for task {}: {}", taskId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to fetch available channels"));
        }
    }
}