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

        // NEW: Support for video type (main or short)
        String videoType = revisionRequest.getType() != null ? revisionRequest.getType() : "main";

        Revision revision = new Revision(
                task,
                nextRevisionNumber,
                revisionRequest.getEditedVideoUrl(),
                revisionRequest.getEditedVideoFilename(),
                videoType,
                revisionRequest.getNotes(),
                uploadedBy
        );

        Revision savedRevision = revisionRepository.save(revision);

        // Add auto comment about new revision
        String typeLabel = "short".equals(videoType) ? " (Short)" : "";
        Comment autoComment = new Comment(
                task,
                "New video revision #" + nextRevisionNumber + typeLabel + " has been uploaded.",
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

    // NEW: Get revisions by task and type
    public List<Revision> getRevisionsByTaskAndType(Long taskId, String type) {
        return revisionRepository.findByVideoTaskIdAndTypeOrderByRevisionNumberDesc(taskId, type);
    }

    // NEW: Get main video revisions
    public List<Revision> getMainRevisionsByTask(Long taskId) {
        return getRevisionsByTaskAndType(taskId, "main");
    }

    // NEW: Get short video revisions
    public List<Revision> getShortRevisionsByTask(Long taskId) {
        return getRevisionsByTaskAndType(taskId, "short");
    }

    public Revision getRevisionById(Long revisionId) {
        return revisionRepository.findById(revisionId)
                .orElseThrow(() -> new RuntimeException("Revision not found"));
    }

    public Optional<Revision> getLatestRevision(Long taskId) {
        return revisionRepository.findLatestRevisionByTaskId(taskId);
    }

    // NEW: Get latest revision by type
    public Optional<Revision> getLatestRevisionByType(Long taskId, String type) {
        return revisionRepository.findLatestRevisionByTaskIdAndType(taskId, type);
    }

    // NEW: Get latest main revision
    public Optional<Revision> getLatestMainRevision(Long taskId) {
        return getLatestRevisionByType(taskId, "main");
    }

    // NEW: Get latest short revision
    public Optional<Revision> getLatestShortRevision(Long taskId) {
        return getLatestRevisionByType(taskId, "short");
    }

    // Get count of revisions by type
    public long getRevisionCountByType(Long taskId, String type) {
        return revisionRepository.countByVideoTaskIdAndType(taskId, type);
    }

    public long getMainRevisionCount(Long taskId) {
        return getRevisionCountByType(taskId, "main");
    }

    public long getShortRevisionCount(Long taskId) {
        return getRevisionCountByType(taskId, "short");
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

    // NEW: Check if task has revisions ready for upload
    public boolean hasRevisionsReadyForUpload(Long taskId) {
        List<Revision> revisions = getRevisionsByTask(taskId);
        return !revisions.isEmpty();
    }

    // NEW: Get revisions suitable for YouTube upload (both main and shorts)
    public List<Revision> getRevisionsForYouTubeUpload(Long taskId) {
        return getRevisionsByTask(taskId);
    }

    // NEW: Get revisions by IDs (for multi-video upload)
    public List<Revision> getRevisionsByIds(List<Long> revisionIds) {
        return revisionRepository.findAllById(revisionIds);
    }
}