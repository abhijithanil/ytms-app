package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingsDTO {
    private Boolean allMessages;
    private Boolean mentions;
    private Boolean directMessages;
    private Boolean reactions;
    private Boolean replies;
    private String frequency; // INSTANT, DIGEST_HOURLY, DIGEST_DAILY, OFF
    private Boolean soundEnabled;
    private Boolean desktopNotifications;
    private Boolean emailNotifications;
    private String quietHoursStart;
    private String quietHoursEnd;
}
