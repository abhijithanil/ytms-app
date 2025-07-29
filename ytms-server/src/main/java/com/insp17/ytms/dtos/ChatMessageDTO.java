package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.ChatMessage;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {
    private Long id;
    private String content;
    private Long senderId;
    private String senderUsername;
    private String senderName;
    private ChatMessage.MessageType type;
    private LocalDateTime createdAt;
    private Long taskId;

    public ChatMessageDTO(ChatMessage message) {
        this.id = message.getId();
        this.content = message.getContent();
        this.senderId = message.getSenderId();
        this.senderUsername = message.getSenderUsername();
        this.senderName = message.getSenderName();
        this.type = message.getType();
        this.createdAt = message.getCreatedAt();
        this.taskId = message.getTaskId();
    }
}
