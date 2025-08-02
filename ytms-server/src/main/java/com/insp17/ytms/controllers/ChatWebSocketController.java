package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.SendMessageRequest;
import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.service.ChatMessageService;
import com.insp17.ytms.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatWebSocketController {

    @Autowired
    private ChatMessageService messageService;

    @Autowired
    private UserService userService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/channel/{channelId}/send")
    public void sendMessage(@DestinationVariable Long channelId, 
                           @Payload SendMessageRequest request, 
                           Principal principal) {
        try {
            // Get user from authentication
            User sender = getUserFromPrincipal(principal);
            if (sender != null) {
                messageService.sendMessage(channelId, request, sender);
            }
        } catch (Exception e) {
            // Send error message back to sender
            messagingTemplate.convertAndSendToUser(
                principal.getName(), 
                "/queue/errors", 
                "Failed to send message: " + e.getMessage()
            );
        }
    }

    @MessageMapping("/channel/{channelId}/typing")
    public void handleTyping(@DestinationVariable Long channelId, 
                            @Payload String status, 
                            Principal principal) {
        try {
            User user = getUserFromPrincipal(principal);
            if (user != null) {
                // Broadcast typing indicator to channel subscribers (except sender)
                messagingTemplate.convertAndSend(
                    "/topic/channel/" + channelId + "/typing",
                    new TypingIndicator(user.getId(), user.getFistName() + " " + user.getLastName(), status)
                );
            }
        } catch (Exception e) {
            // Ignore typing errors
        }
    }

    private User getUserFromPrincipal(Principal principal) {
        if (principal instanceof Authentication) {
            Authentication auth = (Authentication) principal;
            if (auth.getPrincipal() instanceof UserPrincipal) {
                UserPrincipal userPrincipal = (UserPrincipal) auth.getPrincipal();
                return userService.getUserById(userPrincipal.getId());
            }
        }
        return null;
    }

    // Inner class for typing indicator
    public static class TypingIndicator {
        private Long userId;
        private String userName;
        private String status; // "typing" or "stopped"

        public TypingIndicator(Long userId, String userName, String status) {
            this.userId = userId;
            this.userName = userName;
            this.status = status;
        }

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }

        public String getUserName() { return userName; }
        public void setUserName(String userName) { this.userName = userName; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}