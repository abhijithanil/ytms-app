package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.service.ChatService;
import com.insp17.ytms.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

    // Helper method to extract UserPrincipal from Principal
    private UserPrincipal getUserPrincipalFromPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken) {
            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
            if (auth.getPrincipal() instanceof UserPrincipal) {
                return (UserPrincipal) auth.getPrincipal();
            }
        }
        return null;
    }

    // REST endpoints for chat history and online users
    @GetMapping("/history")
    public ResponseEntity<List<ChatMessageDTO>> getChatHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) Long taskId) {
        List<ChatMessageDTO> messages = chatService.getChatHistory(taskId, page, size);
        return ResponseEntity.ok(messages);
    }

    @GetMapping("/online-users")
    public ResponseEntity<List<OnlineUserDTO>> getOnlineUsers() {
        List<OnlineUserDTO> users = chatService.getOnlineUsers();
        return ResponseEntity.ok(users);
    }

    // WebSocket message handlers
    @MessageMapping("/chat/join")
    public void joinChat(Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                User userById = userService.getUserByIdPrivateUse(userPrincipal.getId());
                String sessionId = headerAccessor.getSessionId();

                chatService.addOnlineUser(sessionId, userById);

                log.info("User {} joined chat with session {}", userPrincipal.getUsername(), sessionId);
            } else {
                log.warn("Join chat attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling chat join: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/chat/global")
    public void sendGlobalMessage(Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                User userById = userService.getUserByIdPrivateUse(userPrincipal.getId());
                String content = (String) payload.get("content");
                if (content != null && !content.trim().isEmpty()) {
                    chatService.sendMessage(content, userById, null);
                    log.info("Global message sent by user: {}", userPrincipal.getUsername());
                }
            } else {
                log.warn("Message send attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling global message: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/chat/task/{taskId}")
    public void sendTaskMessage(@DestinationVariable Long taskId, Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                User userById = userService.getUserByIdPrivateUse(userPrincipal.getId());

                String content = (String) payload.get("content");
                if (content != null && !content.trim().isEmpty()) {
                    chatService.sendMessage(content, userById, taskId);
                    log.info("Task message sent by user: {} for task: {}", userPrincipal.getUsername(), taskId);
                }
            } else {
                log.warn("Task message send attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling task message: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/typing/global")
    public void handleGlobalTyping(Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                Boolean isTyping = (Boolean) payload.get("isTyping");
                if (isTyping != null) {
                    TypingIndicatorDTO typingIndicator = new TypingIndicatorDTO();
                    typingIndicator.setUserId(userPrincipal.getId());
                    typingIndicator.setUsername(userPrincipal.getUsername());
                    typingIndicator.setTyping(isTyping); // Changed from setTyping to setIsTyping
                    typingIndicator.setTaskId(null);

                    chatService.broadcastTypingIndicator(typingIndicator);
                }
            } else {
                log.warn("Global typing attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling global typing indicator: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/typing/task/{taskId}")
    public void handleTaskTyping(@DestinationVariable Long taskId, Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                Boolean isTyping = (Boolean) payload.get("isTyping");
                if (isTyping != null) {
                    TypingIndicatorDTO typingIndicator = new TypingIndicatorDTO();
                    typingIndicator.setUserId(userPrincipal.getId());
                    typingIndicator.setUsername(userPrincipal.getUsername());
                    typingIndicator.setTyping(isTyping); // Changed from setTyping to setIsTyping
                    typingIndicator.setTaskId(taskId);

                    chatService.broadcastTypingIndicator(typingIndicator);
                }
            } else {
                log.warn("Task typing attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling task typing indicator: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/users/status")
    public void updateUserStatus(Map<String, Object> payload, Principal principal) {
        try {
            UserPrincipal userPrincipal = getUserPrincipalFromPrincipal(principal);
            if (userPrincipal != null) {
                String status = (String) payload.get("status");
                if (status != null) {
                    chatService.updateUserStatus(userPrincipal.getId(), status);
                    log.info("User {} updated status to: {}", userPrincipal.getUsername(), status);
                }
            } else {
                log.warn("Status update attempt without valid authentication - principal: {}", principal);
            }
        } catch (Exception e) {
            log.error("Error handling status update: {}", e.getMessage(), e);
        }
    }
}