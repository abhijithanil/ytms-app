package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendReplyRequest {
    private Long parentMessageId;
    private Long chatRoomId;
    private String content;
    private String attachmentUrl;
    private String attachmentName;
    private String attachmentType;
}

