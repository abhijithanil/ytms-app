package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatNotificationDTO {
    private Long id;
    private String type; // MENTION, REPLY, REACTION, MESSAGE
    private String title;
    private String content;
    private Long chatRoomId;
    private String roomName;
    private Long messageId;
    private String senderName;
    private LocalDateTime createdAt;
    private Boolean isRead;
    private String actionUrl;
}
