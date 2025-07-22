package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.Comment;

import java.time.LocalDateTime;

public class CommentDTO {
    private Long id;
    private Long videoTaskId;
    private Long revisionId;
    private String content;
    private UserDTO author;
    private LocalDateTime createdAt;

    public CommentDTO() {
    }

    public CommentDTO(Comment comment) {
        this.id = comment.getId();
        this.videoTaskId = comment.getVideoTask().getId();
        this.revisionId = comment.getRevision() != null ? comment.getRevision().getId() : null;
        this.content = comment.getContent();
        this.author = comment.getAuthor() != null ? new UserDTO(comment.getAuthor()) : null;
        this.createdAt = comment.getCreatedAt();
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVideoTaskId() {
        return videoTaskId;
    }

    public void setVideoTaskId(Long videoTaskId) {
        this.videoTaskId = videoTaskId;
    }

    public Long getRevisionId() {
        return revisionId;
    }

    public void setRevisionId(Long revisionId) {
        this.revisionId = revisionId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public UserDTO getAuthor() {
        return author;
    }

    public void setAuthor(UserDTO author) {
        this.author = author;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
