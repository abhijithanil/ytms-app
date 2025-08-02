package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.OnlineUser;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnlineUserDTO {
    private Long userId;
    private String username;
    private String displayName;
    private String firstName;
    private String lastName;
    private String email;
    private String sessionId;
    private LocalDateTime lastSeen;
    private String status;
    private String statusMessage;

    public OnlineUserDTO(OnlineUser onlineUser) {
        this.userId = onlineUser.getUserId();
        this.username = onlineUser.getUsername();
        this.displayName = onlineUser.getDisplayName();
        this.firstName = onlineUser.getFirstName();
        this.lastName = onlineUser.getLastName();
        this.email = onlineUser.getEmail();
        this.sessionId = onlineUser.getSessionId();
        this.lastSeen = onlineUser.getLastSeen();
        this.status = onlineUser.getStatus();
        this.statusMessage = onlineUser.getStatusMessage();
    }
}