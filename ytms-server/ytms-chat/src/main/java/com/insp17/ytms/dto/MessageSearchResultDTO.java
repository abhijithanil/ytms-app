package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageSearchResultDTO {
    private Long messageId;
    private String content;
    private String highlightedContent; // Content with search terms highlighted
    private String senderName;
    private String senderUsername;
    private LocalDateTime createdAt;
    private Long chatRoomId;
    private String roomName;
    private String roomType;
    private String contextBefore; // Brief context before the message
    private String contextAfter; // Brief context after the message
    private Float relevanceScore;
}
