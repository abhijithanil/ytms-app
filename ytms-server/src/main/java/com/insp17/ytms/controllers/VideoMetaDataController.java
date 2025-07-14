package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.CurrentUser;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.dtos.VideoMetadataDTO;
import com.insp17.ytms.dtos.VideoMetadataResponseDTO;
import com.insp17.ytms.service.FileStorageService;
import com.insp17.ytms.service.VideoMetadataService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/metadata")
@RequiredArgsConstructor
@Slf4j
public class VideoMetaDataController {

    private final FileStorageService fileStorageService;
    private final VideoMetadataService videoMetadataService;


    @PostMapping("/{taskId}")
//    @PreAuthorize("hasRole('ADMIN') or (hasRole('EDITOR') and @taskService.isAssignedEditor(#taskId, authentication.name)) or @taskService.isTaskCreator(#taskId, authentication.name)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<VideoMetadataResponseDTO> createVideoMetadata(
            @PathVariable Long taskId,
            @Valid @RequestBody VideoMetadataDTO metadataDTO, @CurrentUser UserPrincipal userPrincipal) {

        try {
            log.info("Creating video metadata for task ID: {}", taskId);
            VideoMetadataResponseDTO response = videoMetadataService.createOrUpdateVideoMetadata(taskId, metadataDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalStateException e) {
            log.warn("Video metadata already exists for task ID: {}", taskId);
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            log.error("Failed to create video metadata for task ID: {}", taskId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/task/{taskId}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('EDITOR') and @taskService.isAssignedEditor(#taskId, authentication.name)) or @taskService.isTaskCreator(#taskId, authentication.name)")
    public ResponseEntity<VideoMetadataResponseDTO> updateVideoMetadata(
            @PathVariable Long taskId,
            @Valid @RequestBody VideoMetadataDTO metadataDTO, @CurrentUser UserPrincipal userPrincipal) {

        try {
            log.info("Updating video metadata for task ID: {}", taskId);
            VideoMetadataResponseDTO response = videoMetadataService.createOrUpdateVideoMetadata(taskId, metadataDTO);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update video metadata for task ID: {}", taskId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/task/{taskId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('EDITOR')")
    public ResponseEntity<VideoMetadataResponseDTO> getVideoMetadata(@PathVariable Long taskId, @CurrentUser UserPrincipal userPrincipal) {
        if (userPrincipal == null) {
            log.error("UserPrincipal is null for task ID: {}. This indicates an authentication issue.", taskId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            log.info("Retrieving video metadata for task ID: {}", taskId);
            VideoMetadataResponseDTO response = videoMetadataService.getVideoMetadata(taskId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to retrieve video metadata for task ID: {}", taskId, e);
            VideoMetadataResponseDTO metadataResponseDTO = new VideoMetadataResponseDTO();
            return ResponseEntity.ok(metadataResponseDTO);
        }
    }

    @DeleteMapping("/task/{taskId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteVideoMetadata(@PathVariable Long taskId) {
        try {
            log.info("Deleting video metadata for task ID: {}", taskId);
            videoMetadataService.deleteVideoMetadata(taskId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Failed to delete video metadata for task ID: {}", taskId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/task/{taskId}/exists")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('EDITOR') and @taskService.isAssignedEditor(#taskId, authentication.name)) or @taskService.isTaskCreator(#taskId, authentication.name)")
    public ResponseEntity<Map<String, Boolean>> checkVideoMetadataExists(@PathVariable Long taskId) {
        try {
            boolean exists = videoMetadataService.hasVideoMetadata(taskId);
            return ResponseEntity.ok(Map.of("exists", exists));
        } catch (Exception e) {
            log.error("Failed to check video metadata existence for task ID: {}", taskId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/task/{taskId}/create-or-update")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('EDITOR') and @taskService.isAssignedEditor(#taskId, authentication.name)) or @taskService.isTaskCreator(#taskId, authentication.name)")
    public ResponseEntity<VideoMetadataResponseDTO> createOrUpdateVideoMetadata(
            @PathVariable Long taskId,
             @RequestBody VideoMetadataDTO metadataDTO) {

        try {
            log.info("Creating or updating video metadata for task ID: {}", taskId);

            VideoMetadataResponseDTO response = videoMetadataService.createOrUpdateVideoMetadata(taskId, metadataDTO);
//            if (videoMetadataService.hasVideoMetadata(taskId)) {
//                response = videoMetadataService.updateVideoMetadata(taskId, metadataDTO);
//            } else {
//                response = videoMetadataService.createVideoMetadata(taskId, metadataDTO);
//            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to create or update video metadata for task ID: {}", taskId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}