package com.insp17.ytms.dtos;

public class SendMessageRequest {
    private String content;
    private String messageType; // Will be converted to enum
    private Long parentMessageId; // For threading

    // Constructors
    public SendMessageRequest() {}

    public SendMessageRequest(String content, String messageType, Long parentMessageId) {
        this.content = content;
        this.messageType = messageType;
        this.parentMessageId = parentMessageId;
    }

    // Getters and setters
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }

    public Long getParentMessageId() { return parentMessageId; }
    public void setParentMessageId(Long parentMessageId) { this.parentMessageId = parentMessageId; }
}