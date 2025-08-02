package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageUpdateDTO {
    private Long messageId;
    private String updateType; // EDITED, DELETED, PINNED, UNPINNED, REACTION_ADDED, REACTION_REMOVED
    private String newContent;
    private LocalDateTime updatedAt;
    private Long updatedBy;
    private String updatedByUsername;
    private Object metadata; // Additional data like reaction info
}