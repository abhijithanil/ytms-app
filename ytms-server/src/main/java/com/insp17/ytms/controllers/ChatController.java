package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.service.ChatService;
import com.insp17.ytms.service.UserService;
import com.insp17.ytms.service.VideoTaskService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@Slf4j
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private UserService userService;

    @Autowired
    private VideoTaskService videoTaskService;

    // WebSocket message mappings
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload Map<String, Object> chatMessage,
                            SimpMessageHeaderAccessor headerAccessor,
                            Principal principal) {
        try {
            if (principal == null) {
                log.warn("Unauthenticated user trying to send message");
                return;
            }

            String content = (String) chatMessage.get("content");
            if (content == null || content.trim().isEmpty()) {
                log.warn("Empty message content");
                return;
            }

            Long taskId = null;
            if (chatMessage.get("taskId") != null) {
                try {
                    taskId = Long.valueOf(chatMessage.get("taskId").toString());
                } catch (NumberFormatException e) {
                    log.warn("Invalid taskId format: {}", chatMessage.get("taskId"));
                    return;
                }
            }

            User sender = userService.getUserByUsernameEntity(principal.getName());

            // Verify task access if taskId is provided
            if (taskId != null && !videoTaskService.canUserAccessTask(taskId, sender)) {
                log.warn("User {} denied access to task chat {}", sender.getUsername(), taskId);
                return;
            }

            chatService.sendMessage(content.trim(), sender, taskId);

        } catch (Exception e) {
            log.error("Error sending chat message", e);
        }
    }

    @MessageMapping("/chat.join")
    public void addUser(@Payload Map<String, Object> userInfo,
                        SimpMessageHeaderAccessor headerAccessor,
                        Principal principal) {
        try {
            if (principal == null) {
                log.warn("Unauthenticated user trying to join chat");
                return;
            }

            String sessionId = headerAccessor.getSessionId();
            User user = userService.getUserByUsernameEntity(principal.getName());

            chatService.addOnlineUser(sessionId, user);
            log.info("User {} joined chat with session {}", user.getUsername(), sessionId);

        } catch (Exception e) {
            log.error("Error adding user to chat", e);
        }
    }

    @MessageMapping("/chat.typing")
    public void handleTyping(@Payload TypingIndicatorDTO typingIndicator,
                             Principal principal) {
        try {
            if (principal == null) {
                return;
            }

            User user = userService.getUserByUsernameEntity(principal.getName());

            // Verify task access if taskId is provided
            if (typingIndicator.getTaskId() != null &&
                    !videoTaskService.canUserAccessTask(typingIndicator.getTaskId(), user)) {
                return;
            }

            typingIndicator.setUserId(user.getId());
            typingIndicator.setUsername(user.getUsername());

            chatService.broadcastTypingIndicator(typingIndicator);

        } catch (Exception e) {
            log.error("Error handling typing indicator", e);
        }
    }

    @MessageMapping("/chat.status")
    public void updateUserStatus(@Payload Map<String, String> statusUpdate,
                                 Principal principal) {
        try {
            if (principal == null) {
                return;
            }

            String status = statusUpdate.get("status");
            if (status == null || (!status.equals("online") && !status.equals("away") && !status.equals("busy"))) {
                log.warn("Invalid status: {}", status);
                return;
            }

            UserResponse user = userService.getUserByUsername(principal.getName());
            chatService.updateUserStatus(user.getId(), status);

        } catch (Exception e) {
            log.error("Error updating user status", e);
        }
    }

    // REST endpoints
    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    public ResponseEntity<List<ChatMessageDTO>> getChatHistory(
            @RequestParam(required = false) Long taskId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            // Verify task access if taskId is provided
            if (taskId != null) {
                User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
                if (!videoTaskService.canUserAccessTask(taskId, user)) {
                    return ResponseEntity.status(403).build();
                }
            }

            List<ChatMessageDTO> messages = chatService.getChatHistory(taskId, page, size);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching chat history", e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/online-users")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    public ResponseEntity<List<OnlineUserDTO>> getOnlineUsers(@CurrentUser UserPrincipal userPrincipal) {
        try {
            List<OnlineUserDTO> onlineUsers = chatService.getOnlineUsers();
            return ResponseEntity.ok(onlineUsers);
        } catch (Exception e) {
            log.error("Error fetching online users", e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    public ResponseEntity<Map<String, Object>> getChatStats(
            @RequestParam(required = false) Long taskId,
            @CurrentUser UserPrincipal userPrincipal) {

        try {
            // Verify task access if taskId is provided
            if (taskId != null) {
                User user = userService.getUserByIdPrivateUse(userPrincipal.getId());
                if (!videoTaskService.canUserAccessTask(taskId, user)) {
                    return ResponseEntity.status(403).build();
                }
            }

            Map<String, Object> stats = Map.of(
                    "messageCount", chatService.getMessageCount(taskId),
                    "onlineUsersCount", chatService.getOnlineUsers().size()
            );

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error fetching chat stats", e);
            return ResponseEntity.status(500).build();
        }
    }
}