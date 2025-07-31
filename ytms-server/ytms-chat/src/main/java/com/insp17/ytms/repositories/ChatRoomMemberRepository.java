package com.insp17.ytms.repositories;

import com.insp17.ytms.entity.ChatRoomMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {

    // Find member in a room
    Optional<ChatRoomMember> findByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    // Find all members of a room
    List<ChatRoomMember> findByChatRoomIdOrderByJoinedAtAsc(Long chatRoomId);

    // Find all rooms for a user
    List<ChatRoomMember> findByUserIdOrderByJoinedAtDesc(Long userId);

    // Check if user is member of room
    boolean existsByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    // Count members in room
    long countByChatRoomId(Long chatRoomId);

    // Find room admins/owners
    List<ChatRoomMember> findByChatRoomIdAndRoleIn(Long chatRoomId, List<ChatRoomMember.MemberRole> roles);

    // Remove member from room
    void deleteByChatRoomIdAndUserId(Long chatRoomId, Long userId);
}
