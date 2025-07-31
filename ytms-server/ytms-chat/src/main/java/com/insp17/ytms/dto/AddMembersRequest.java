package com.insp17.ytms.dto;

import com.insp17.ytms.entity.ChatRoomMember;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddMembersRequest {
    private List<Long> userIds = new ArrayList<>();
    private ChatRoomMember.MemberRole defaultRole = ChatRoomMember.MemberRole.MEMBER;
}
