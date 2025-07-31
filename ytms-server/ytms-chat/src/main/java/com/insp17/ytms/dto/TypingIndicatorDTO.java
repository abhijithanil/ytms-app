package com.insp17.ytms.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TypingIndicatorDTO {
    private Long userId;
    private String username;
    private boolean isTyping;
    private Long taskId; // Optional: for task-specific chats
    private Long chatRoomId; // Optional: for room-specific chats

}