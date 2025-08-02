package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPresenceDTO {
    private Long userId;
    private String username;
    private String displayName;
    private String status; // online, away, busy, offline
    private String statusMessage;
    private LocalDateTime lastActiveAt;
    private LocalDateTime statusUpdatedAt;
    private Boolean isTyping;
    private Long typingInRoomId;
}
