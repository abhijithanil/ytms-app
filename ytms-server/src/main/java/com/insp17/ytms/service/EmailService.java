package com.insp17.ytms.service;

import com.insp17.ytms.dtos.InviteRequest;
import com.insp17.ytms.dtos.SignUpRequest;
import com.insp17.ytms.entity.*;
import com.insp17.ytms.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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

    @Value("${HOST_URL:http://localhost:8080}") // Default to localhost for local dev
    private String hostUrl;

    @Value("${UI_HOST_URL:http://localhost:3000/admin}") // Default to localhost for local dev
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

    public void sendUserVerificationEmail(String email, String token) {
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

                String content = "<html><body style='font-family:Arial, sans-serif; text-align:center;'>"
                        + "<div style='max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background-color: #f9f9f9;'>"
                        + "<img src='" + companyLogo + "' alt='Logo' style='width:120px; margin-bottom:20px;' />"
                        + "<h2 style='color: #333;'>New User Signup Request</h2>"
                        + "<p style='color: #555; font-size:16px;'>A new user: <b style='color:#007BFF;'>" + signupRequest.getEmail() + "</p>"
                        + "<p style='color: #555; font-size:14px;'>Please log in to your admin panel to approve or reject this request.</p>"
                        + "<a href='" + consoleUrl + "' style='display:inline-block; padding: 12px 24px; font-size: 16px; "
                        + "color: #fff; background-color: #007BFF; text-decoration: none; border-radius: 5px; margin:20px 0;'>"
                        + "🔑 Login to Admin Panel</a>"
                        + "<hr style='margin: 20px 0;'>"
                        + "<p style='color: #aaa; font-size:12px;'>© 2025 " + companyName + ". All rights reserved.</p>"
                        + "</div>"
                        + "</body></html>";
                sendEmail(admin.getEmail(), subject, content);
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

            // Using a more robust HTML structure for email compatibility
            String content = "<!DOCTYPE html>" // 1. Added DOCTYPE for better rendering consistency
                    + "<html lang='en'>"
                    + "<head>"
                    + "<meta charset='UTF-8'>"
                    + "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                    + "<title>" + subject + "</title>"
                    + "</head>"
                    + "<body style='font-family:Arial, sans-serif; margin:0; padding:0; background-color:#f4f4f4;'>" // 2. Reset body margin/padding
                    + "<div style='max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 10px; background-color: #ffffff; border: 1px solid #ddd;'>"
                    + "<div style='text-align:center;'>" // Centering the logo
                    + "<img src='" + companyLogo + "' alt='Logo' style='width:120px; margin-bottom:20px;' />"
                    + "</div>"
                    + "<h2 style='color: #333; text-align:center;'>Welcome to " + companyName + "!</h2>"
                    + "<p style='color: #555; font-size:16px;'>Hi there,</p>"
                    + "<p style='color: #555; font-size:16px;'>You've been invited to join <b style='color:#007BFF;'>" + companyName + "</b> platform.</p>"
                    + "<p style='color: #555; font-size:14px;'>Click the button below to create your account and get started:</p>"
                    + "<div style='text-align:center;'>" // 3. Centering the button
                    + "<a href='" + url + "' style='display:inline-block; padding: 12px 24px; font-size: 16px; "
                    + "color: #fff; background-color: #28a745; text-decoration: none; border-radius: 5px; margin:20px 0;'>"
                    + "🚀 Create My Account</a>"
                    + "</div>"
                    + "<div style='margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px; border: 1px solid #eee;'>"
                    + "<p style='color: #666; font-size:14px; margin:0;'><b>Invitation Details:</b></p>"
                    + "<p style='color: #666; font-size:14px; margin:10px 0 5px;'>Email: <b>" + inviteRequest.getEmail() + "</b></p>"
                    + "<p style='color: #666; font-size:14px; margin:5px 0;'>Role: <b>" + inviteRequest.getUserRole() + "</b></p>"
                    + "</div>"
                    + "<p style='color: #dc3545; font-size:12px; text-align:center;'>⚠️ This invitation link will expire in 24 hours.</p>"
                    + "<hr style='margin: 20px 0; border:none; border-top: 1px solid #eee;'>"
                    + "<div style='text-align:center; color: #aaa; font-size:12px;'>"
                    + "<p style='margin:5px 0;'>If you didn't expect this invitation, please ignore this email.</p>"
                    + "<p style='margin:5px 0;'>© " + java.time.Year.now().getValue() + " " + companyName + ". All rights reserved.</p>" // 4. Dynamically set the year
                    + "</div>"
                    + "</div>"
                    + "</body></html>";

            sendEmail(inviteRequest.getEmail(), subject, content);
            log.info("Invitation email sent to: {}", inviteRequest.getEmail());

        } catch (Exception e) {
            log.error("Failed to send invitation email to {}: {}", inviteRequest.getEmail(), e.getMessage());
        }
    }

    @Async("verificationEmailTaskExecutor")
    public void sendUserInvitationDeclineEmail(String invitor, InviteRequest inviteRequestOp) {
    }
}