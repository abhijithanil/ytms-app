package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomListResponse {
    private List<ChatRoomDTO> directMessages = new ArrayList<>();
    private List<ChatRoomDTO> groupChats = new ArrayList<>();
    private List<ChatRoomDTO> taskChats = new ArrayList<>();
    private Long totalUnreadCount;
    private ChatRoomDTO globalChat;
}