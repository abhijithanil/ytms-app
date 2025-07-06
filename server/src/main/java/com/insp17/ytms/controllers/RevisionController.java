package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.CurrentUser;
import com.insp17.ytms.dtos.RevisionDTO;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.entity.Revision;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.service.RevisionService;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.VideoTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
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

    @PostMapping
    @PreAuthorize("hasRole('EDITOR') or hasRole('ADMIN')")
    public ResponseEntity<RevisionDTO> createRevision(
            @RequestParam("taskId") Long taskId,
            @RequestParam("videoFile") MultipartFile videoFile,
            @RequestParam(value = "notes", required = false) String notes,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            if (!videoTaskService.canUserAccessTask(taskId, userPrincipal.getId())) {
                return ResponseEntity.status(403).build();
            }

            User uploadedBy = userService.getUserById(userPrincipal.getId());
            Revision revision = revisionService.createRevision(taskId, videoFile, notes, uploadedBy);
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
}