package com.insp17.ytms.dto;

import com.insp17.ytms.entity.ChatMessage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageSearchRequest {
    private String query;
    private Long chatRoomId;
    private LocalDateTime fromDate;
    private LocalDateTime toDate;
    private Long senderId;
    private ChatMessage.MessageType messageType;
    private int page = 0;
    private int size = 20;
}