package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.CurrentUser;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.dtos.VideoMetadataDTO;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.VideoMetadataService;
import com.insp17.ytms.service.VideoTaskService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/metadata")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class VideoMetadataController {

    @Autowired
    private VideoMetadataService videoMetadataService;

    @Autowired
    private VideoTaskService videoTaskService;

    @Autowired
    private UserService userService;

    // === TASK-LEVEL METADATA ENDPOINTS ===

    @PostMapping("/{taskId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<VideoMetadataDTO> createTaskMetadata(
            @PathVariable Long taskId,
            @RequestBody VideoMetadataDTO metadataDTO,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
            if (!videoTaskService.canUserAccessTask(taskId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            VideoMetadataDTO response = videoMetadataService.createOrUpdateVideoMetadata(taskId, metadataDTO);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to create task metadata for task {}: {}", taskId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<VideoMetadataDTO> getTaskMetadata(
            @PathVariable Long taskId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
            if (!videoTaskService.canUserAccessTask(taskId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            VideoMetadataDTO response = videoMetadataService.getVideoMetadata(taskId);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            log.error("Failed to get task metadata for task {}: {}", taskId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{taskId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<VideoMetadataDTO> updateTaskMetadata(
            @PathVariable Long taskId,
            @RequestBody VideoMetadataDTO metadataDTO,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
            if (!videoTaskService.canUserAccessTask(taskId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            VideoMetadataDTO response = videoMetadataService.createOrUpdateVideoMetadata(taskId, metadataDTO);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to update task metadata for task {}: {}", taskId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/task/{taskId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<Void> deleteTaskMetadata(
            @PathVariable Long taskId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
            if (!videoTaskService.canUserAccessTask(taskId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            videoMetadataService.deleteVideoMetadata(taskId);
            return ResponseEntity.noContent().build();

        } catch (Exception e) {
            log.error("Failed to delete task metadata for task {}: {}", taskId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // === REVISION-SPECIFIC METADATA ENDPOINTS ===

    @PostMapping("/revision/{revisionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<VideoMetadataDTO> createRevisionMetadata(
            @PathVariable Long revisionId,
            @RequestBody VideoMetadataDTO metadataDTO,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            // Check access through the revision's parent task
            if (!videoTaskService.canUserAccessRevision(revisionId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            VideoMetadataDTO response = videoMetadataService.createOrUpdateRevisionMetadata(revisionId, metadataDTO);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to create revision metadata for revision {}: {}", revisionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/revision/{revisionId}")
    public ResponseEntity<VideoMetadataDTO> getRevisionMetadata(
            @PathVariable Long revisionId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            // Check access through the revision's parent task
            if (!videoTaskService.canUserAccessRevision(revisionId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            VideoMetadataDTO response = videoMetadataService.getRevisionMetadata(revisionId);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            log.error("Failed to get revision metadata for revision {}: {}", revisionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/revision/{revisionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<VideoMetadataDTO> updateRevisionMetadata(
            @PathVariable Long revisionId,
            @RequestBody VideoMetadataDTO metadataDTO,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            // Check access through the revision's parent task
            if (!videoTaskService.canUserAccessRevision(revisionId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            VideoMetadataDTO response = videoMetadataService.createOrUpdateRevisionMetadata(revisionId, metadataDTO);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to update revision metadata for revision {}: {}", revisionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/revision/{revisionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<Void> deleteRevisionMetadata(
            @PathVariable Long revisionId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            // Check access through the revision's parent task
            if (!videoTaskService.canUserAccessRevision(revisionId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            videoMetadataService.deleteRevisionMetadata(revisionId);
            return ResponseEntity.noContent().build();

        } catch (Exception e) {
            log.error("Failed to delete revision metadata for revision {}: {}", revisionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // === MULTIPLE REVISIONS METADATA ENDPOINTS ===

    @PostMapping("/revisions/multiple")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<Map<Long, VideoMetadataDTO>> createMultipleRevisionMetadata(
            @RequestBody Map<Long, VideoMetadataDTO> metadataMap,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            // Validate access to all revisions
            for (Long revisionId : metadataMap.keySet()) {
                if (!videoTaskService.canUserAccessRevision(revisionId, user)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }

            Map<Long, VideoMetadataDTO> response = videoMetadataService.createOrUpdateMultipleRevisionMetadata(metadataMap);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to create multiple revision metadata: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/revisions/get-multiple")
    public ResponseEntity<Map<Long, VideoMetadataDTO>> getMultipleRevisionMetadata(
            @RequestBody Map<String, List<Long>> request,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
            List<Long> revisionIds = request.get("revisionIds");

            if (revisionIds == null || revisionIds.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            // Validate access to all revisions
            for (Long revisionId : revisionIds) {
                if (!videoTaskService.canUserAccessRevision(revisionId, user)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }

            Map<Long, VideoMetadataDTO> response = videoMetadataService.getMultipleRevisionMetadata(revisionIds);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get multiple revision metadata: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // === BATCH OPERATIONS FOR TASK REVISIONS ===

    @GetMapping("/task/{taskId}/revisions/all")
    public ResponseEntity<Map<Long, VideoMetadataDTO>> getAllRevisionMetadataForTask(
            @PathVariable Long taskId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
            if (!videoTaskService.canUserAccessTask(taskId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Map<Long, VideoMetadataDTO> response = videoMetadataService.getAllRevisionMetadataForTask(taskId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get all revision metadata for task {}: {}", taskId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // === RAW VIDEO-SPECIFIC METADATA ENDPOINTS ===

    @PostMapping("/raw-video/{rawVideoId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<VideoMetadataDTO> createRawVideoMetadata(
            @PathVariable Long rawVideoId,
            @RequestBody VideoMetadataDTO metadataDTO,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            if (user.getRole() != com.insp17.ytms.entity.UserRole.ADMIN &&
                    user.getRole() != com.insp17.ytms.entity.UserRole.EDITOR) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            VideoMetadataDTO response = videoMetadataService.createOrUpdateRawVideoMetadata(rawVideoId, metadataDTO);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to create raw video metadata for raw video {}: {}", rawVideoId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/raw-video/{rawVideoId}")
    public ResponseEntity<VideoMetadataDTO> getRawVideoMetadata(
            @PathVariable Long rawVideoId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            VideoMetadataDTO response = videoMetadataService.getRawVideoMetadata(rawVideoId);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.notFound().build();
            }
            log.error("Failed to get raw video metadata for raw video {}: {}", rawVideoId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/raw-video/{rawVideoId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<VideoMetadataDTO> updateRawVideoMetadata(
            @PathVariable Long rawVideoId,
            @RequestBody VideoMetadataDTO metadataDTO,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            if (user.getRole() != com.insp17.ytms.entity.UserRole.ADMIN &&
                    user.getRole() != com.insp17.ytms.entity.UserRole.EDITOR) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            VideoMetadataDTO response = videoMetadataService.createOrUpdateRawVideoMetadata(rawVideoId, metadataDTO);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to update raw video metadata for raw video {}: {}", rawVideoId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/raw-video/{rawVideoId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<Void> deleteRawVideoMetadata(
            @PathVariable Long rawVideoId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            videoMetadataService.deleteRawVideoMetadata(rawVideoId);
            return ResponseEntity.noContent().build();

        } catch (Exception e) {
            log.error("Failed to delete raw video metadata for raw video {}: {}", rawVideoId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // === MULTI-VIDEO METADATA ENDPOINTS (Legacy Support) ===

    @PostMapping("/multiple/revisions")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<Map<Long, VideoMetadataDTO>> createMultipleRevisionMetadataLegacy(
            @RequestBody Map<Long, VideoMetadataDTO> metadataMap,
            @CurrentUser UserPrincipal userPrincipal) {

        // This is an alias for the new endpoint for backward compatibility
        return createMultipleRevisionMetadata(metadataMap, userPrincipal);
    }

    @PostMapping("/multiple/revisions/get")
    public ResponseEntity<Map<Long, VideoMetadataDTO>> getMultipleRevisionMetadataLegacy(
            @RequestBody Map<String, List<Long>> request,
            @CurrentUser UserPrincipal userPrincipal) {

        // This is an alias for the new endpoint for backward compatibility
        return getMultipleRevisionMetadata(request, userPrincipal);
    }

    @PostMapping("/multiple/raw-videos/get")
    public ResponseEntity<Map<Long, VideoMetadataDTO>> getMultipleRawVideoMetadata(
            @RequestBody Map<String, List<Long>> request,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
            List<Long> rawVideoIds = request.get("rawVideoIds");

            if (rawVideoIds == null || rawVideoIds.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            Map<Long, VideoMetadataDTO> response = videoMetadataService.getMultipleRawVideoMetadata(rawVideoIds);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get multiple raw video metadata: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // === UTILITY ENDPOINTS ===

    @GetMapping("/task/{taskId}/all")
    public ResponseEntity<List<VideoMetadataDTO>> getAllMetadataForTask(
            @PathVariable Long taskId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
            if (!videoTaskService.canUserAccessTask(taskId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            List<VideoMetadataDTO> response = videoMetadataService.getAllMetadataForTask(taskId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get all metadata for task {}: {}", taskId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/task/{taskId}/exists")
    public ResponseEntity<Map<String, Object>> checkMetadataExists(
            @PathVariable Long taskId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
            if (!videoTaskService.canUserAccessTask(taskId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            boolean hasTaskMetadata = videoMetadataService.hasVideoMetadata(taskId);
            boolean hasAnyMetadata = videoMetadataService.hasAnyMetadataForTask(taskId);
            long metadataCount = videoMetadataService.getMetadataCountForTask(taskId);

            Map<String, Object> response = Map.of(
                    "hasTaskMetadata", hasTaskMetadata,
                    "hasAnyMetadata", hasAnyMetadata,
                    "metadataCount", metadataCount
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to check metadata existence for task {}: {}", taskId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/revision/{revisionId}/exists")
    public ResponseEntity<Map<String, Boolean>> checkRevisionMetadataExists(
            @PathVariable Long revisionId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            // Check access through the revision's parent task
            if (!videoTaskService.canUserAccessRevision(revisionId, user)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            boolean hasMetadata = videoMetadataService.hasRevisionMetadata(revisionId);
            Map<String, Boolean> response = Map.of("hasMetadata", hasMetadata);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to check revision metadata existence for revision {}: {}", revisionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/raw-video/{rawVideoId}/exists")
    public ResponseEntity<Map<String, Boolean>> checkRawVideoMetadataExists(
            @PathVariable Long rawVideoId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            User user = userService.getUserByIdPrivateUse(userPrincipal.getId());

            boolean hasMetadata = videoMetadataService.hasRawVideoMetadata(rawVideoId);
            Map<String, Boolean> response = Map.of("hasMetadata", hasMetadata);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to check raw video metadata existence for raw video {}: {}", rawVideoId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // === LEGACY COMPATIBILITY ENDPOINTS ===

//    @PostMapping("/{taskId}")
//    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
//    public ResponseEntity<VideoMetadataResponseDTO> createMetadata(
//            @PathVariable Long taskId,
//            @RequestBody VideoMetadataDTO metadataDTO,
//            @CurrentUser UserPrincipal userPrincipal) {
//
//        // This is an alias for createTaskMetadata for backward compatibility
//        return createTaskMetadata(taskId, metadataDTO, userPrincipal);
//    }
//
//    @GetMapping("/{taskId}")
//    public ResponseEntity<VideoMetadataResponseDTO> getMetadata(
//            @PathVariable Long taskId,
//            @CurrentUser UserPrincipal userPrincipal) {
//
//        // This is an alias for getTaskMetadata for backward compatibility
//        return getTaskMetadata(taskId, userPrincipal);
//    }
//
//    @PutMapping("/{taskId}")
//    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
//    public ResponseEntity<VideoMetadataResponseDTO> updateMetadata(
//            @PathVariable Long taskId,
//            @RequestBody VideoMetadataDTO metadataDTO,
//            @CurrentUser UserPrincipal userPrincipal) {
//
//        // This is an alias for updateTaskMetadata for backward compatibility
//        return updateTaskMetadata(taskId, metadataDTO, userPrincipal);
//    }
//
//    @DeleteMapping("/{taskId}")
//    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
//    public ResponseEntity<Void> deleteMetadata(
//            @PathVariable Long taskId,
//            @CurrentUser UserPrincipal userPrincipal) {
//
//        // This is an alias for deleteTaskMetadata for backward compatibility
//        return deleteTaskMetadata(taskId, userPrincipal);
//    }
}