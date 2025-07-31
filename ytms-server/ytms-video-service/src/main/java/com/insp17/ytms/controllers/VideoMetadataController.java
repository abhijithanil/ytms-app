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


    //  BATCH OPERATIONS FOR TASK REVISIONS 

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


    //  UTILITY ENDPOINTS 

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

}