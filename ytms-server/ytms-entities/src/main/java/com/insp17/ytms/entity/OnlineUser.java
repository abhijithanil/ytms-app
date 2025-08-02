package com.insp17.ytms.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnlineUser {
    private Long userId;
    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private String sessionId;
    private LocalDateTime lastSeen;
    private String status; // online, away, busy, offline
    private String statusMessage;

    public String getDisplayName() {
        if (firstName != null && !firstName.trim().isEmpty()) {
            if (lastName != null && !lastName.trim().isEmpty()) {
                return firstName + " " + lastName;
            }
            return firstName;
        }
        return username;
    }
}