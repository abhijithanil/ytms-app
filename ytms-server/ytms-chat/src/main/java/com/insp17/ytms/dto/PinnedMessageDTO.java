package com.insp17.ytms.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PinnedMessageDTO {
    private Long messageId;
    private String content;
    private String senderName;
    private String senderUsername;
    private LocalDateTime createdAt;
    private LocalDateTime pinnedAt;
    private Long pinnedBy;
    private String pinnedByUsername;
}