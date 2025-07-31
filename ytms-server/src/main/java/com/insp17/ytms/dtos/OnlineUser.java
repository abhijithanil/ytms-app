package com.insp17.ytms.dtos;

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
    private String status;
    private LocalDateTime lastSeen;
}
