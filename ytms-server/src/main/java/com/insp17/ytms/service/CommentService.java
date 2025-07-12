package com.insp17.ytms.service;

import com.insp17.ytms.entity.Comment;
import com.insp17.ytms.entity.Revision;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.VideoTask;
import com.insp17.ytms.repository.CommentRepository;
import com.insp17.ytms.repository.RevisionRepository;
import com.insp17.ytms.repository.VideoTaskRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Transactional
public class CommentService {

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private VideoTaskRepository videoTaskRepository;

    @Autowired
    private RevisionRepository revisionRepository;

    public Comment addComment(Long taskId, String content, User author) {
        VideoTask task = videoTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        Comment comment = new Comment(task, content, author);
        return commentRepository.save(comment);
    }

    public Comment updateComment(Long taskId, Long commentId, String comment, User author) {
        return null;
    }

    public Comment addCommentToRevision(Long revisionId, String content, User author) {
        Revision revision = revisionRepository.findById(revisionId)
                .orElseThrow(() -> new RuntimeException("Revision not found"));

        Comment comment = new Comment(revision.getVideoTask(), content, author);
        comment.setRevision(revision);
        return commentRepository.save(comment);
    }

    public List<Comment> getCommentsByTask(Long taskId) {
        return commentRepository.findByVideoTaskIdOrderByCreatedAtDesc(taskId);
    }

    public Comment getCommentById(Long id) {
        return commentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
    }

    public Comment updateComment(Long id, String content) {
        Comment comment = getCommentById(id);
        comment.setContent(content);
        return commentRepository.save(comment);
    }

    public void deleteComment(Long id) {
        commentRepository.deleteByIdNativeSql(id);
    }
}
