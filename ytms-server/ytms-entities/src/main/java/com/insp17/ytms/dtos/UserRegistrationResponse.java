package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class UserRegistrationResponse {
    private Boolean success;
    private String message;
    private long userId;
    private String username;

    public UserRegistrationResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }
}
