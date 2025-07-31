package com.insp17.ytms.service;

import com.insp17.ytms.dtos.InviteRequest;
import com.insp17.ytms.dtos.SignUpRequest;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.repository.UserRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.from}")
    private String fromEmail;

    @Autowired
    private UserRepository userRepository;

    @Value("${company.name:YTMSTeam}")
    private String companyName;

    @Value("${company.logo:https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.pngegg.com%2Fen%2Fpng-konuz&psig=AOvVaw2sLrqBYzY330mc3iK_swYU&ust=1752578649513000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCPCi4rOevI4DFQAAAAAdAAAAABAE}")
    private String companyLogo;

    @Value("${HOST_URL:http://localhost:8080}")
    private String hostUrl;

    @Value("${UI_HOST_URL:http://localhost:3000/admin}")
    private String consoleUrl;

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

        sendSimpleEmail(editor.getEmail(), subject, body);
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
            sendSimpleEmail(task.getAssignedEditor().getEmail(), subject, body);
        }

        // Send to task creator
        if (task.getCreatedBy() != null && !task.getCreatedBy().equals(changedBy)) {
            sendSimpleEmail(task.getCreatedBy().getEmail(), subject, body);
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
            sendSimpleEmail(task.getCreatedBy().getEmail(), subject, body);
        }

        // Send to assigned editor if different from uploader
        if (task.getAssignedEditor() != null && !task.getAssignedEditor().equals(uploadedBy)) {
            sendSimpleEmail(task.getAssignedEditor().getEmail(), subject, body);
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
            sendSimpleEmail(task.getCreatedBy().getEmail(), subject, body);
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
            sendSimpleEmail(task.getCreatedBy().getEmail(), subject, body);
        }

        if (task.getAssignedEditor() != null) {
            sendSimpleEmail(task.getAssignedEditor().getEmail(), subject, body);
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
            sendSimpleEmail(oldEditor.getEmail(), subject, bodyOld);
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
            sendSimpleEmail(newEditor.getEmail(), subject, bodyNew);
        }
    }

    public void sendUserVerificationEmail(String email, String token) {
        // Implementation needed
    }

    @Async("verificationEmailTaskExecutor")
    public void notifyAdminsForApproval(@Valid SignUpRequest signupRequest) {
        try {
            List<User> activeAdmins = userRepository.findByRoleAndUserStatus(UserRole.ADMIN, UserStatus.ACTIVE);

            if (activeAdmins.isEmpty()) {
                log.warn("No active admins found. Approval emails will not be sent.");
                return;
            }

            for (User admin : activeAdmins) {
                String subject = "🔔 New User Signup Request - Admin Approval Needed";

                String content = buildHtmlEmailTemplate(
                        "New User Signup Request",
                        "<p style='color: #555; font-size:16px;'>A new user: <b style='color:#007BFF;'>" + signupRequest.getEmail() + "</b> has requested access to the platform.</p>" +
                                "<p style='color: #555; font-size:14px;'>Please log in to your admin panel to approve or reject this request.</p>",
                        consoleUrl,
                        "🔑 Login to Admin Panel"
                );

                sendHtmlEmail(admin.getEmail(), subject, content);
                log.info("Approval email sent to admin: {}", admin.getEmail());
            }
        } catch (Exception e) {
            log.error("Failed to send email: {}", e.getMessage());
        }
    }

    @Async("verificationEmailTaskExecutor")
    public void sendUserInviteEmail(String url, InviteRequest inviteRequest) {
        try {
            String subject = "🎉 You're Invited to Join " + companyName;

            String mainContent =
                    "<p style='color: #555; font-size:16px;'>Hi there,</p>" +
                            "<p style='color: #555; font-size:16px;'>You've been invited to join <b style='color:#007BFF;'>" + companyName + "</b> platform.</p>" +
                            "<p style='color: #555; font-size:14px;'>Click the button below to create your account and get started:</p>" +
                            "<div style='margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px; border: 1px solid #eee;'>" +
                            "<p style='color: #666; font-size:14px; margin:0;'><b>Invitation Details:</b></p>" +
                            "<p style='color: #666; font-size:14px; margin:10px 0 5px;'>Email: <b>" + inviteRequest.getEmail() + "</b></p>" +
                            "<p style='color: #666; font-size:14px; margin:5px 0;'>Role: <b>" + inviteRequest.getUserRole() + "</b></p>" +
                            "</div>" +
                            "<p style='color: #dc3545; font-size:12px; text-align:center;'>⚠️ This invitation link will expire in 24 hours.</p>";

            String content = buildHtmlEmailTemplate(
                    "Welcome to " + companyName + "!",
                    mainContent,
                    url,
                    "🚀 Create My Account"
            );

            sendHtmlEmail(inviteRequest.getEmail(), subject, content);
            log.info("Invitation email sent to: {}", inviteRequest.getEmail());

        } catch (Exception e) {
            log.error("Failed to send invitation email to {}: {}", inviteRequest.getEmail(), e.getMessage());
        }
    }

    @Async("verificationEmailTaskExecutor")
    public void sendUserInvitationDeclineEmail(String invitor, InviteRequest inviteRequestOp) {
        // Implementation needed
    }

    // ==================== HELPER METHODS ====================

    /**
     * Sends a plain text email using SimpleMailMessage
     */
    private void sendSimpleEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            log.debug("Plain text email sent successfully to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send plain text email to: {}, Error: {}", to, e.getMessage());
        }
    }

    /**
     * Sends an HTML email using MimeMessage
     */
    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true indicates HTML content

            mailSender.send(message);
            log.debug("HTML email sent successfully to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send HTML email to: {}, Error: {}", to, e.getMessage());
        }
    }

    /**
     * Builds a consistent HTML email template
     */
    private String buildHtmlEmailTemplate(String title, String mainContent, String actionUrl, String actionButtonText) {
        return "<!DOCTYPE html>" +
                "<html lang='en'>" +
                "<head>" +
                "<meta charset='UTF-8'>" +
                "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>" + title + "</title>" +
                "</head>" +
                "<body style='font-family:Arial, sans-serif; margin:0; padding:0; background-color:#f4f4f4;'>" +
                "<div style='max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 10px; background-color: #ffffff; border: 1px solid #ddd;'>" +

                // Header with logo
                "<div style='text-align:center;'>" +
                "<img src='" + companyLogo + "' alt='Logo' style='width:120px; margin-bottom:20px;' />" +
                "</div>" +

                // Title
                "<h2 style='color: #333; text-align:center;'>" + title + "</h2>" +

                // Main content
                mainContent +

                // Action button (if provided)
                (actionUrl != null && actionButtonText != null ?
                        "<div style='text-align:center;'>" +
                                "<a href='" + actionUrl + "' style='display:inline-block; padding: 12px 24px; font-size: 16px; " +
                                "color: #fff; background-color: #28a745; text-decoration: none; border-radius: 5px; margin:20px 0;'>" +
                                actionButtonText + "</a>" +
                                "</div>" : "") +

                // Footer
                "<hr style='margin: 20px 0; border:none; border-top: 1px solid #eee;'>" +
                "<div style='text-align:center; color: #aaa; font-size:12px;'>" +
                "<p style='margin:5px 0;'>If you didn't expect this email, please ignore it.</p>" +
                "<p style='margin:5px 0;'>© " + java.time.Year.now().getValue() + " " + companyName + ". All rights reserved.</p>" +
                "</div>" +
                "</div>" +
                "</body></html>";
    }

    /**
     * Legacy method for backward compatibility - now routes to appropriate method
     */
    @Deprecated
    private void sendEmail(String to, String subject, String body) {
        // Auto-detect if content is HTML or plain text
        if (body.trim().startsWith("<") && body.contains("</")) {
            sendHtmlEmail(to, subject, body);
        } else {
            sendSimpleEmail(to, subject, body);
        }
    }


    /**
     * Public method to send simple text emails
     */
    public void sendTextEmail(String to, String subject, String textBody) {
        sendSimpleEmail(to, subject, textBody);
    }

    /**
     * Public method to send HTML emails
     */
    public void sendFormattedEmail(String to, String subject, String htmlBody) {
        sendHtmlEmail(to, subject, htmlBody);
    }

    /**
     * Public method to send notification with template
     */
    public void sendNotificationEmail(String to, String title, String message, String actionUrl, String actionText) {
        String subject = title + " - " + companyName;
        String content = buildHtmlEmailTemplate(title, message, actionUrl, actionText);
        sendHtmlEmail(to, subject, content);
    }
}