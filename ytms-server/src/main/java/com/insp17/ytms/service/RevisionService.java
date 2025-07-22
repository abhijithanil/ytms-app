package com.insp17.ytms.service;

import com.insp17.ytms.dtos.RevisionRequest;
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

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class RevisionService {

    @Autowired
    private RevisionRepository revisionRepository;

    @Autowired
    private VideoTaskRepository videoTaskRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private EmailService emailService;

    public Revision createRevision(RevisionRequest revisionRequest, User uploadedBy) throws IOException {
        VideoTask task = videoTaskRepository.findById(revisionRequest.getVideoTaskId())
                .orElseThrow(() -> new RuntimeException("Task not found"));

        Integer nextRevisionNumber = getNextRevisionNumber(revisionRequest.getVideoTaskId());


        Revision revision = new Revision(
                task, nextRevisionNumber, revisionRequest.getEditedVideoUrl(), revisionRequest.getEditedVideoFilename(), revisionRequest.getNotes(), uploadedBy
        );

        Revision savedRevision = revisionRepository.save(revision);

        // Add auto comment about new revision
        Comment autoComment = new Comment(
                task,
                "New video revision #" + nextRevisionNumber + " has been uploaded.",
                uploadedBy
        );
        autoComment.setRevision(savedRevision);
        commentRepository.save(autoComment);

        // Send email notification
        emailService.sendRevisionUploadedEmail(task, nextRevisionNumber, uploadedBy);

        return savedRevision;
    }

    private Integer getNextRevisionNumber(Long taskId) {
        Integer maxRevision = revisionRepository.findMaxRevisionNumberByTaskId(taskId);
        return maxRevision == null ? 1 : maxRevision + 1;
    }

    public List<Revision> getRevisionsByTask(Long taskId) {
        return revisionRepository.findByVideoTaskIdOrderByRevisionNumberDesc(taskId);
    }

    public Revision getRevisionById(Long revisionId) {
        return revisionRepository.findById(revisionId)
                .orElseThrow(() -> new RuntimeException("Revision not found"));
    }

    public Optional<Revision> getLatestRevision(Long taskId) {
        return revisionRepository.findLatestRevisionByTaskId(taskId);
    }


    @Transactional
    public void deleteRevision(Long revisionId) {
        System.out.println("Attempting to delete revision with ID: " + revisionId);

        Revision revision = revisionRepository.findById(revisionId)
                .orElseThrow(() -> new RuntimeException("Revision not found with ID: " + revisionId));

        try {
            fileStorageService.deleteFileFromGCP(revision.getEditedVideoUrl());
            System.out.println("File deleted from GCP.");
        } catch (Exception e) {
            System.err.println("Error deleting from GCP: " + e.getMessage());
        }

        List<Comment> comments = commentRepository.findByRevisionId(revisionId);

        if (comments != null && !comments.isEmpty()) {
            for (Comment comment : comments) {
                try {
                    commentRepository.deleteByIdNativeSql(comment.getId());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

        System.out.println("About to delete from database...");
        int deletedRows = revisionRepository.deleteByIdNativeSql(revisionId);
        System.out.println("Deleted rows: " + deletedRows);

        revisionRepository.flush();
        System.out.println("Flushed changes");
    }
}