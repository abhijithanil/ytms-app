package com.insp17.ytms.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ThreadInfoDTO {
    private Long parentMessageId;
    private Integer replyCount;
    private LocalDateTime lastReplyAt;
    private List<String> participantUsernames;
    private Boolean hasUnreadReplies;
    private Long unreadReplyCount;
}
