package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.UserRole;
import com.insp17.ytms.entity.UserStatus;
import lombok.Data;

@Data
public class UpdateUserRequest {
    private String username;
    private String firstName;
    private  String lastName;
    private String email;
    private UserRole role;
    private UserStatus userStatus;
}
