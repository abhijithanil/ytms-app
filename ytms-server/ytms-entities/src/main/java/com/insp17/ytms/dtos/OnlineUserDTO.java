package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.OnlineUser;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class OnlineUserDTO {
    private Long userId;
    private String username;
    private String displayName;
    private String email;
    private String status;
    private LocalDateTime lastSeen;

    public OnlineUserDTO(OnlineUser onlineUser) {
        this.userId = onlineUser.getUserId();
        this.username = onlineUser.getUsername();
        this.email = onlineUser.getEmail();
        this.status = onlineUser.getStatus();
        this.lastSeen = onlineUser.getLastSeen();

        // Create display name from first and last name
        if (onlineUser.getFirstName() != null && onlineUser.getLastName() != null) {
            this.displayName = onlineUser.getFirstName() + " " + onlineUser.getLastName();
        } else {
            this.displayName = onlineUser.getUsername();
        }
    }
}