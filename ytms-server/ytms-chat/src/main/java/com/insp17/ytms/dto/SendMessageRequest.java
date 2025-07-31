package com.insp17.ytms.dto;

import com.insp17.ytms.entity.ChatMessage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    private String content;
    private Long chatRoomId;
    private Long parentMessageId; // For thread replies
    private ChatMessage.MessageType type = ChatMessage.MessageType.CHAT;
    private String attachmentUrl;
    private String attachmentName;
    private String attachmentType;
    private List<Long> mentionedUserIds = new ArrayList<>();
}