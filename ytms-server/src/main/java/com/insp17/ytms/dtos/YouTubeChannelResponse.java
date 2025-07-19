package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class YouTubeChannelResponse {
    private boolean success;
    private String message;
    private YouTubeChannelDTO channel;

    public YouTubeChannelResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }
}