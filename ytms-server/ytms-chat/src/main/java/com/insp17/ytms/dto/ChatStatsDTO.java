package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatStatsDTO {
    private Long totalMessages;
    private Long totalUsers;
    private Long messagesThisWeek;
    private Long messagesThisMonth;
    private Long activeUsers;
    private LocalDateTime mostRecentMessage;
    private String mostActiveUser;
    private Long totalReactions;
    private Long totalThreads;
    private Long totalAttachments;
    private Double averageMessagesPerDay;
}
