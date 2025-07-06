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
import org.springframework.web.multipart.MultipartFile;

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

    public Revision createRevision(Long taskId, MultipartFile videoFile, String notes, User uploadedBy) throws IOException {
        VideoTask task = videoTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        Integer nextRevisionNumber = getNextRevisionNumber(taskId);

        FileStorageService.FileUploadResult result = fileStorageService.uploadVideo(videoFile, "revisions");

        Revision revision = new Revision(
                task,
                nextRevisionNumber,
                result.getUrl(),
                result.getOriginalFilename(),
                notes,
                uploadedBy
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
}