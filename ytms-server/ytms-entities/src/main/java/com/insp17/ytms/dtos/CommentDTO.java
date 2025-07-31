package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.Comment;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentDTO {
    private Long id;
    private Long videoTaskId;
    private Long revisionId;
    private String content;
    private UserDTO author;
    private LocalDateTime createdAt;


    public CommentDTO(Comment comment) {
        this.id = comment.getId();
        this.videoTaskId = comment.getVideoTask().getId();
        this.revisionId = comment.getRevision() != null ? comment.getRevision().getId() : null;
        this.content = comment.getContent();
        this.author = comment.getAuthor() != null ? new UserDTO(comment.getAuthor()) : null;
        this.createdAt = comment.getCreatedAt();
    }
}
