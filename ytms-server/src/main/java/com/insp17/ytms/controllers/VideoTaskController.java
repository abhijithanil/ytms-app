package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.service.FileStorageService;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.VideoTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


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


    @GetMapping
    public ResponseEntity<List<VideoTaskDTO>> getAllTasks(@CurrentUser UserPrincipal userPrincipal) {
        List<VideoTask> tasks = videoTaskService.getAccessibleTasksForUser(userPrincipal.getId());
        List<VideoTaskDTO> taskDTOs = tasks.stream()
                .map(VideoTaskDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(taskDTOs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VideoTaskDTO> getTaskById(@PathVariable Long id, @CurrentUser UserPrincipal userPrincipal) {
        if (!videoTaskService.canUserAccessTask(id, userPrincipal.getId())) {
            return ResponseEntity.status(403).build();
        }
        VideoTask task = videoTaskService.getTaskByIdWithDetails(id).orElseThrow();
        return ResponseEntity.ok(new VideoTaskDTO(task));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<VideoTaskDTO> createTask(@RequestBody CreateTaskRequest createTaskRequest, @CurrentUser UserPrincipal userPrincipal) {
        try {
            User creator = userService.getUserById(userPrincipal.getId());
            VideoTask task = new VideoTask(createTaskRequest.getTitle(), createTaskRequest.getDescription(), creator);

            task.setTaskPriority(createTaskRequest.getPriority());
            task.setPrivacyLevel(createTaskRequest.getPrivacyLevel());

            if (createTaskRequest.getDeadline() != null && !createTaskRequest.getDeadline().isEmpty()) {
                task.setDeadline(LocalDateTime.parse(createTaskRequest.getDeadline()));
            }

            if (createTaskRequest.getAssignedEditorId() != null) {
                User editor = userService.getUserById(createTaskRequest.getAssignedEditorId());
                task.setAssignedEditor(editor);
                task.setTaskStatus(TaskStatus.ASSIGNED);
            }

            if (createTaskRequest.getRawVideoUrl() != null && !createTaskRequest.getRawVideoUrl().isEmpty()) {
                task.setRawVideoUrl(createTaskRequest.getRawVideoUrl());
                task.setRawVideoFilename(createTaskRequest.getRawVideoFilename());
            }

            VideoTask createdTask = videoTaskService.createTask(task);

            if (createTaskRequest.getPrivacyLevel() == PrivacyLevel.SELECTED && createTaskRequest.getUserIds() != null) {
                videoTaskService.setTaskPrivacy(createdTask.getId(), PrivacyLevel.SELECTED, createTaskRequest.getUserIds());
            }

            return ResponseEntity.ok(new VideoTaskDTO(createdTask));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/generate-upload-url")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<?> generateUploadUrl(@RequestParam("filename") String filename, @RequestParam("type") String type, @RequestParam("folder") String folder) {
        try {
            String uniqueFilename = fileStorageService.generateUniqueFilename(filename);
            String objectName = folder + "/" + uniqueFilename;

            String signedUrl = fileStorageService.generateResumableUploadUrl(objectName, type);

            Map<String, String> response = new HashMap<>();
            response.put("signedUrl", signedUrl);
            response.put("objectName", objectName);
            System.out.println(response);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not generate upload URL: " + e.getMessage());
        }
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VideoTaskDTO> assignEditor(@PathVariable Long id, @RequestBody AssignEditorRequest request, @CurrentUser UserPrincipal userPrincipal) {
        User assignedBy = userService.getUserById(userPrincipal.getId());
        VideoTask task = videoTaskService.assignEditor(id, request.getEditorId(), assignedBy);
        return ResponseEntity.ok(new VideoTaskDTO(task));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<VideoTaskDTO> updateStatus(@PathVariable Long id, @RequestBody UpdateStatusRequest request, @CurrentUser UserPrincipal userPrincipal) {
        User updatedBy = userService.getUserById(userPrincipal.getId());
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

    @PostMapping("/{id}/audio-instructions")
    public ResponseEntity<AudioInstructionDTO> addAudioInstruction(
            @PathVariable Long id,
            @RequestParam("audioFile") MultipartFile audioFile,
            @RequestParam(value = "description", required = false) String description,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            if (!videoTaskService.canUserAccessTask(id, userPrincipal.getId())) {
                return ResponseEntity.status(403).build();
            }

            User uploadedBy = userService.getUserById(userPrincipal.getId());
            AudioInstruction audioInstruction = videoTaskService.addAudioInstruction(id, audioFile, description, uploadedBy);
            return ResponseEntity.ok(new AudioInstructionDTO(audioInstruction));

        } catch (IOException e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}/audio-instructions")
    public ResponseEntity<List<AudioInstructionDTO>> getAudioInstructions(@PathVariable Long id, @CurrentUser UserPrincipal userPrincipal) {
        if (!videoTaskService.canUserAccessTask(id, userPrincipal.getId())) {
            return ResponseEntity.status(403).build();
        }
        List<AudioInstruction> audioInstructions = videoTaskService.getAudioInstructions(id);
        List<AudioInstructionDTO> audioDTOs = audioInstructions.stream()
                .map(AudioInstructionDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(audioDTOs);
    }

    @GetMapping("/editor/{editorId}")
    public ResponseEntity<List<VideoTaskDTO>> getTasksByEditor(@PathVariable Long editorId) {
        List<VideoTask> tasks = videoTaskService.getTasksByEditor(editorId);
        List<VideoTaskDTO> taskDTOs = tasks.stream()
                .map(VideoTaskDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(taskDTOs);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<VideoTaskDTO>> getTasksByStatus(@PathVariable TaskStatus status) {
        List<VideoTask> tasks = videoTaskService.getTasksByStatus(status);
        List<VideoTaskDTO> taskDTOs = tasks.stream()
                .map(VideoTaskDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(taskDTOs);
    }
}
