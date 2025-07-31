package com.insp17.ytms.dto;

import com.insp17.ytms.entity.ChatRoom;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateChatRoomRequest {
    private String roomName;
    private String roomDescription;
    private ChatRoom.RoomType roomType;
    private Boolean isPrivate = false;
    private List<Long> memberIds = new ArrayList<>();
    private Long taskId; // For task chats
    private Long dmParticipantId; // For direct messages
}