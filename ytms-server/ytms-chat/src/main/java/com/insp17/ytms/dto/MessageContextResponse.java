package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageContextResponse {
    private ChatMessageDTO targetMessage;
    private List<ChatMessageDTO> messagesBefore;
    private List<ChatMessageDTO> messagesAfter;
    private Long roomId;
    private String roomName;
}