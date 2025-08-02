package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageReactionDTO {
    private String emoji;
    private String reactionType;
    private Integer count;
    private List<Long> userIds = new ArrayList<>();
    private List<String> usernames = new ArrayList<>();
    private Boolean currentUserReacted;
    private LocalDateTime firstReactionAt;
    private LocalDateTime lastReactionAt;
}