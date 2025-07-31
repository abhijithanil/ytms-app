package com.insp17.ytms.dtos;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class YouTubeAccount {
    private String email;
    private String secretName;
    private String addedBy;
    private LocalDateTime connectedAt;
}