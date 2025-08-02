package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MentionDTO {
    private Long messageId;
    private Long chatRoomId;
    private String roomName;
    private String content;
    private String senderName;
    private String senderUsername;
    private LocalDateTime mentionedAt;
    private Boolean isRead;
    private LocalDateTime readAt;
}