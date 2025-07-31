package com.insp17.ytms.dtos;

public class ChannelTokenStatus {
    private final String channelName;
    private final String channelId;
    private final String refreshTokenKey;
    private final boolean hasToken;
    private final boolean tokenWorking;

    public ChannelTokenStatus(String channelName, String channelId, String refreshTokenKey,
                              boolean hasToken, boolean tokenWorking) {
        this.channelName = channelName;
        this.channelId = channelId;
        this.refreshTokenKey = refreshTokenKey;
        this.hasToken = hasToken;
        this.tokenWorking = tokenWorking;
    }

    // Getters
    public String getChannelName() {
        return channelName;
    }

    public String getChannelId() {
        return channelId;
    }

    public String getRefreshTokenKey() {
        return refreshTokenKey;
    }

    public boolean isHasToken() {
        return hasToken;
    }

    public boolean isTokenWorking() {
        return tokenWorking;
    }
}