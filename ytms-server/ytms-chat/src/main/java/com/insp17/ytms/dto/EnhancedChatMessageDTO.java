package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class EnhancedChatMessageDTO extends ChatMessageDTO {
    private Map<String, MessageReactionDTO> reactionsMap;
    private List<PinnedMessageDTO> pinnedMessages;
    private ThreadInfoDTO threadInfo;
    private Boolean isPinned;
    private Boolean isEditable;
    private Boolean isDeletable;
    private List<String> mentionedUsernames;
    private String replyPreview; // Short preview of what this message is replying to
}