package com.insp17.ytms.dtos;

public class JwtAuthenticationResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private UserSummary user;

    public JwtAuthenticationResponse(String accessToken, UserPrincipal userPrincipal) {
        this.accessToken = accessToken;
        this.user = new UserSummary(
                userPrincipal.getId(),
                userPrincipal.getUsername(),
                userPrincipal.getEmail(),
                userPrincipal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "")
        );
    }

    // Getters and setters
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }

    public UserSummary getUser() { return user; }
    public void setUser(UserSummary user) { this.user = user; }
}