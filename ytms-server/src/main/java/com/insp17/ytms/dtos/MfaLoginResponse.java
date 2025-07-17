package com.insp17.ytms.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MfaLoginResponse {
    private boolean success;
    private String message;
    private String token;
    private UserPrincipal user;
}
