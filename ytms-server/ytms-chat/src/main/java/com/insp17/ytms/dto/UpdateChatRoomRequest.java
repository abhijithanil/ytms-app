package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateChatRoomRequest {
    private String roomName;
    private String roomDescription;
    private Boolean isPrivate;
    private Boolean isArchived;
}
