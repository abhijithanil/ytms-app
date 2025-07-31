package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DirectMessageRequest {
    private Long recipientId;
    private String content;
    private String attachmentUrl;
    private String attachmentName;
    private String attachmentType;
}