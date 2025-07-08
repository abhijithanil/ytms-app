package com.insp17.ytms.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import com.insp17.ytms.entity.VideoTask;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.TaskStatus;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.from}")
    private String fromEmail;

    @Async("verificationEmailTaskExecutor")
    public void sendTaskAssignedEmail(VideoTask task, User editor) {
        String subject = "New Task Assigned: " + task.getTitle();
        String body = String.format(
                "Hi %s,\n\n" +
                        "A new task has been assigned to you:\n\n" +
                        "Task: %s\n" +
                        "Description: %s\n" +
                        "Priority: %s\n" +
                        "Deadline: %s\n\n" +
                        "Please log in to the system to view the task details.\n\n" +
                        "Best regards,\n" +
                        "VideoFlow Team",
                editor.getUsername(),
                task.getTitle(),
                task.getDescription(),
                task.getTaskPriority(),
                task.getDeadline() != null ? task.getDeadline().toString() : "Not set"
        );

        sendEmail(editor.getEmail(), subject, body);
    }

    @Async("verificationEmailTaskExecutor")
    public void sendStatusChangeEmail(VideoTask task, TaskStatus oldStatus, TaskStatus newStatus, User changedBy) {
        String subject = "Task Status Updated: " + task.getTitle();
        String body = String.format(
                "Task status has been updated:\n\n" +
                        "Task: %s\n" +
                        "Status changed from: %s\n" +
                        "Status changed to: %s\n" +
                        "Changed by: %s\n\n" +
                        "Please log in to the system to view the task details.\n\n" +
                        "Best regards,\n" +
                        "VideoFlow Team",
                task.getTitle(),
                oldStatus,
                newStatus,
                changedBy.getUsername()
        );

        // Send to assigned editor
        if (task.getAssignedEditor() != null) {
            sendEmail(task.getAssignedEditor().getEmail(), subject, body);
        }

        // Send to task creator
        if (task.getCreatedBy() != null && !task.getCreatedBy().equals(changedBy)) {
            sendEmail(task.getCreatedBy().getEmail(), subject, body);
        }
    }

    @Async("verificationEmailTaskExecutor")
    public void sendRevisionUploadedEmail(VideoTask task, int revisionNumber, User uploadedBy) {
        String subject = "New Revision Uploaded: " + task.getTitle();
        String body = String.format(
                "A new revision has been uploaded:\n\n" +
                        "Task: %s\n" +
                        "Revision Number: %d\n" +
                        "Uploaded by: %s\n\n" +
                        "Please log in to the system to review the revision.\n\n" +
                        "Best regards,\n" +
                        "VideoFlow Team",
                task.getTitle(),
                revisionNumber,
                uploadedBy.getUsername()
        );

        // Send to task creator if different from uploader
        if (task.getCreatedBy() != null && !task.getCreatedBy().equals(uploadedBy)) {
            sendEmail(task.getCreatedBy().getEmail(), subject, body);
        }

        // Send to assigned editor if different from uploader
        if (task.getAssignedEditor() != null && !task.getAssignedEditor().equals(uploadedBy)) {
            sendEmail(task.getAssignedEditor().getEmail(), subject, body);
        }
    }

    @Async("verificationEmailTaskExecutor")
    public void sendTaskReadyForApprovalEmail(VideoTask task, User editor) {
        String subject = "Task Ready for Approval: " + task.getTitle();
        String body = String.format(
                "A task is ready for your approval:\n\n" +
                        "Task: %s\n" +
                        "Editor: %s\n" +
                        "Status: READY\n\n" +
                        "Please log in to the system to review and approve the task.\n\n" +
                        "Best regards,\n" +
                        "VideoFlow Team",
                task.getTitle(),
                editor.getUsername()
        );

        // Send to task creator (admin)
        if (task.getCreatedBy() != null) {
            sendEmail(task.getCreatedBy().getEmail(), subject, body);
        }
    }

    @Async("verificationEmailTaskExecutor")
    public void sendYouTubeUploadNotification(VideoTask task, String youtubeVideoId) {
        String subject = "Video Uploaded to YouTube: " + task.getTitle();
        String body = String.format(
                "Your video has been successfully uploaded to YouTube:\n\n" +
                        "Task: %s\n" +
                        "YouTube Video ID: %s\n" +
                        "YouTube URL: https://www.youtube.com/watch?v=%s\n\n" +
                        "Congratulations on completing the project!\n\n" +
                        "Best regards,\n" +
                        "VideoFlow Team",
                task.getTitle(),
                youtubeVideoId,
                youtubeVideoId
        );

        // Send to all stakeholders
        if (task.getCreatedBy() != null) {
            sendEmail(task.getCreatedBy().getEmail(), subject, body);
        }

        if (task.getAssignedEditor() != null) {
            sendEmail(task.getAssignedEditor().getEmail(), subject, body);
        }
    }

    @Async("verificationEmailTaskExecutor")
    public void sendEditorChangedEmail(VideoTask task, User oldEditor, User newEditor, User changedBy) {
        String subject = "Task Editor Changed: " + task.getTitle();

        // Email to old editor
        if (oldEditor != null) {
            String bodyOld = String.format(
                    "You have been unassigned from the following task:\n\n" +
                            "Task: %s\n" +
                            "Changed by: %s\n\n" +
                            "Thank you for your previous work on this task.\n\n" +
                            "Best regards,\n" +
                            "VideoFlow Team",
                    task.getTitle(),
                    changedBy.getUsername()
            );
            sendEmail(oldEditor.getEmail(), subject, bodyOld);
        }

        // Email to new editor
        if (newEditor != null) {
            String bodyNew = String.format(
                    "You have been assigned to a new task:\n\n" +
                            "Task: %s\n" +
                            "Description: %s\n" +
                            "Priority: %s\n" +
                            "Status: %s\n" +
                            "Assigned by: %s\n\n" +
                            "Please log in to the system to view the task details.\n\n" +
                            "Best regards,\n" +
                            "VideoFlow Team",
                    task.getTitle(),
                    task.getDescription(),
                    task.getTaskPriority(),
                    task.getTaskStatus(),
                    changedBy.getUsername()
            );
            sendEmail(newEditor.getEmail(), subject, bodyNew);
        }
    }

    private void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
        } catch (Exception e) {
            // Log the error but don't fail the main operation
            System.err.println("Failed to send email to: " + to + ", Error: " + e.getMessage());
        }
    }
}