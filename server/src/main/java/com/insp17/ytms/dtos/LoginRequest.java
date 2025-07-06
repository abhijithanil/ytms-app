package com.insp17.ytms.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@Valid
public class LoginRequest {
    @NotBlank
    private String username;

    @NotBlank
    private String password;

    // Getters and setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
