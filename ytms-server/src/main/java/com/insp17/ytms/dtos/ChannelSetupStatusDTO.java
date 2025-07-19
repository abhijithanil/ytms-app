package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChannelSetupStatusDTO {
    private Long channelId;
    private String channelName;
    private String youtubeChannelOwnerEmail;
    private String refreshTokenKey;
    private Boolean hasRefreshToken;
    private Boolean tokenWorking;
    private String setupUrl;
    private String status; // "READY", "NEEDS_SETUP", "TOKEN_EXPIRED", "ERROR"
    private String message;
}