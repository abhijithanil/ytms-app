package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JwtMFAResponse {
    private JwtAuthenticationResponse jwtAuthenticationResponse;
    private String message;
    private Boolean success;

    public JwtMFAResponse(String message, Boolean success) {
        this.message = message;
        this.success = success;
    }
}
