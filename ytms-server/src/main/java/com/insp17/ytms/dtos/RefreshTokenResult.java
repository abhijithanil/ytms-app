package com.insp17.ytms.dtos;

/**
 * Result class for refresh token exchange
 */
public class RefreshTokenResult {
    private final String refreshToken;
    private final String accessToken;
    private final Long expiresInSeconds;

    public RefreshTokenResult(String refreshToken, String accessToken, Long expiresInSeconds) {
        this.refreshToken = refreshToken;
        this.accessToken = accessToken;
        this.expiresInSeconds = expiresInSeconds;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public Long getExpiresInSeconds() {
        return expiresInSeconds;
    }
}