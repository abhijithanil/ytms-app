package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.AddCommentRequest;
import com.insp17.ytms.dtos.CommentDTO;
import com.insp17.ytms.dtos.CurrentUser;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.entity.Comment;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.service.CommentService;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.VideoTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    @Autowired
    private CommentService commentService;

    @Autowired
    private UserService userService;

    @Autowired
    private VideoTaskService videoTaskService;

    @PostMapping("/task/{taskId}")
    public ResponseEntity<CommentDTO> addComment(@PathVariable Long taskId, @RequestBody AddCommentRequest request, @CurrentUser UserPrincipal userPrincipal) {
        if (!videoTaskService.canUserAccessTask(taskId, userPrincipal.getId())) {
            return ResponseEntity.status(403).build();
        }

        User author = userService.getUserById(userPrincipal.getId());
        Comment comment = commentService.addComment(taskId, request.getContent(), author);
        return ResponseEntity.ok(new CommentDTO(comment));
    }

    @PostMapping("/revision/{revisionId}")
    public ResponseEntity<CommentDTO> addCommentToRevision(@PathVariable Long revisionId, @RequestBody AddCommentRequest request, @CurrentUser UserPrincipal userPrincipal) {
        User author = userService.getUserById(userPrincipal.getId());
        Comment comment = commentService.addCommentToRevision(revisionId, request.getContent(), author);
        return ResponseEntity.ok(new CommentDTO(comment));
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<CommentDTO>> getCommentsByTask(@PathVariable Long taskId, @CurrentUser UserPrincipal userPrincipal) {
        if (!videoTaskService.canUserAccessTask(taskId, userPrincipal.getId())) {
            return ResponseEntity.status(403).build();
        }

        List<Comment> comments = commentService.getCommentsByTask(taskId);
        List<CommentDTO> commentDTOs = comments.stream()
                .map(CommentDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(commentDTOs);
    }
}