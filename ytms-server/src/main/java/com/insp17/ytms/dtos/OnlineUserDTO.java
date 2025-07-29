package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.OnlineUser;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnlineUserDTO {
    private Long userId;
    private String username;
    private String displayName;
    private String email;
    private String status;
    private LocalDateTime lastSeen;

    public OnlineUserDTO(OnlineUser user) {
        this.userId = user.getUserId();
        this.username = user.getUsername();
        this.displayName = (user.getFirstName() != null && user.getLastName() != null)
                ? user.getFirstName() + " " + user.getLastName()
                : user.getUsername();
        this.email = user.getEmail();
        this.status = user.getStatus();
        this.lastSeen = user.getLastSeen();
    }
}

