package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.CurrentUser;
import com.insp17.ytms.dtos.RevisionDTO;
import com.insp17.ytms.dtos.RevisionRequest;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.entity.Revision;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.service.FileStorageService;
import com.insp17.ytms.service.RevisionService;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.VideoTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/revisions")
public class RevisionController {

    @Autowired
    private RevisionService revisionService;

    @Autowired
    private VideoTaskService videoTaskService;

    @Autowired
    private UserService userService;

    @Autowired
    private FileStorageService fileStorageService;

    @PostMapping
    @PreAuthorize("hasRole('EDITOR') or hasRole('ADMIN')")
    public ResponseEntity<RevisionDTO> createRevision(@RequestBody RevisionRequest revisionRequest,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            if (!videoTaskService.canUserAccessTask(revisionRequest.getVideoTaskId(), userPrincipal.getId())) {
                return ResponseEntity.status(403).build();
            }

            User uploadedBy = userService.getUserById(userPrincipal.getId());
            Revision revision = revisionService.createRevision(revisionRequest, uploadedBy);
            return ResponseEntity.ok(new RevisionDTO(revision));

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<RevisionDTO>> getRevisionsByTask(@PathVariable Long taskId, @CurrentUser UserPrincipal userPrincipal) {
        if (!videoTaskService.canUserAccessTask(taskId, userPrincipal.getId())) {
            return ResponseEntity.status(403).build();
        }
        List<Revision> revisions = revisionService.getRevisionsByTask(taskId);
        List<RevisionDTO> revisionDTOs = revisions.stream()
                .map(RevisionDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(revisionDTOs);
    }

    @GetMapping("/task/{taskId}/latest")
    public ResponseEntity<RevisionDTO> getLatestRevision(@PathVariable Long taskId, @CurrentUser UserPrincipal userPrincipal) {
        if (!videoTaskService.canUserAccessTask(taskId, userPrincipal.getId())) {
            return ResponseEntity.status(403).build();
        }
        return revisionService.getLatestRevision(taskId)
                .map(revision -> ResponseEntity.ok(new RevisionDTO(revision)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RevisionDTO> getRevisionById(@PathVariable Long id, @CurrentUser UserPrincipal userPrincipal) {
        Revision revision = revisionService.getRevisionById(id);
        if (!videoTaskService.canUserAccessTask(revision.getVideoTask().getId(), userPrincipal.getId())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(new RevisionDTO(revision));
    }

    @GetMapping("/{id}/task/{taskId}/video-url")
    public ResponseEntity<Map<String, String>> getTaskVideoUrl(@PathVariable Long id, @PathVariable Long taskId, @CurrentUser UserPrincipal userPrincipal) {
        if (!videoTaskService.canUserAccessTask(taskId, userPrincipal.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Revision revision = revisionService.getRevisionById(id);
        if (revision.getEditedVideoUrl() == null) {
            return ResponseEntity.notFound().build();
        }

        String objectName = revision.getEditedVideoUrl().replace("gs://" + fileStorageService.getGcpBucketName() + "/", "");
        String signedUrl = fileStorageService.generateSignedUrlForDownload(objectName);

        Map<String, String> response = new HashMap<>();
        response.put("url", signedUrl);
        response.put("objectName", objectName);

        return ResponseEntity.ok(response);
    }
}