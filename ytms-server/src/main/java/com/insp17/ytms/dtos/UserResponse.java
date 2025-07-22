package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserRole;
import com.insp17.ytms.entity.UserStatus;
import jakarta.persistence.Transient;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private Boolean mfaEnabled;
    private UserRole role;
    private LocalDateTime createdAt;
    private UserStatus userStatus;
    private String fistName;
    private String lastName;
    @Transient
    private String secret;

    public UserResponse(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.mfaEnabled = user.isMfaEnabled();
        this.role = user.getRole();
        this.createdAt = user.getCreatedAt();
        this.userStatus = user.getUserStatus();
        this.fistName = user.getFistName();
        this.lastName = user.getLastName();
        this.secret = user.getSecret();
    }

    public boolean isMfaEnabled() {
        return mfaEnabled;
    }
}
