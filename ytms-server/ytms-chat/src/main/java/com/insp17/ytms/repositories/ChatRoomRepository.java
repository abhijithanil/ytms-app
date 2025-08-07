package com.insp17.ytms.repositories;



import com.insp17.ytms.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    // Find DM room between two users
    @Query("SELECT cr FROM ChatRoom cr WHERE cr.roomType = 'DIRECT_MESSAGE' " +
            "AND cr.isArchived = false " +
            "AND EXISTS (SELECT m1 FROM ChatRoomMember m1 WHERE m1.chatRoom = cr AND m1.userId = :userId1) " +
            "AND EXISTS (SELECT m2 FROM ChatRoomMember m2 WHERE m2.chatRoom = cr AND m2.userId = :userId2)")
    Optional<ChatRoom> findDirectMessageRoom(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    // Find all rooms for a user
    @Query("SELECT DISTINCT cr FROM ChatRoom cr " +
            "JOIN cr.members m " +
            "WHERE m.userId = :userId AND cr.isArchived = false " +
            "ORDER BY cr.lastMessageAt DESC NULLS LAST, cr.createdAt DESC")
    List<ChatRoom> findUserChatRooms(@Param("userId") Long userId);

    // Find rooms by type for a user
    @Query("SELECT DISTINCT cr FROM ChatRoom cr " +
            "JOIN cr.members m " +
            "WHERE m.userId = :userId AND cr.roomType = :roomType AND cr.isArchived = false " +
            "ORDER BY cr.lastMessageAt DESC NULLS LAST, cr.createdAt DESC")
    List<ChatRoom> findUserChatRoomsByType(@Param("userId") Long userId, @Param("roomType") ChatRoom.RoomType roomType);

    // Find group chats that user can see
    @Query("SELECT DISTINCT cr FROM ChatRoom cr " +
            "LEFT JOIN cr.members m " +
            "WHERE cr.roomType = 'GROUP_CHAT' AND cr.isArchived = false " +
            "AND (cr.isPrivate = false OR m.userId = :userId) " +
            "ORDER BY cr.lastMessageAt DESC NULLS LAST, cr.createdAt DESC")
    List<ChatRoom> findAvailableGroupChats(@Param("userId") Long userId);

    // Search rooms by name
    @Query("SELECT DISTINCT cr FROM ChatRoom cr " +
            "JOIN cr.members m " +
            "WHERE m.userId = :userId AND cr.isArchived = false " +
            "AND LOWER(cr.roomName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "ORDER BY cr.lastMessageAt DESC NULLS LAST, cr.createdAt DESC")
    List<ChatRoom> searchUserChatRooms(@Param("userId") Long userId, @Param("searchTerm") String searchTerm);

    // Find task chat room
    Optional<ChatRoom> findByTaskIdAndRoomType(Long taskId, ChatRoom.RoomType roomType);

    // Get unread rooms count
    @Query("SELECT COUNT(DISTINCT cr) FROM ChatRoom cr " +
            "JOIN cr.members m " +
            "WHERE m.userId = :userId AND cr.isArchived = false " +
            "AND cr.lastMessageAt > COALESCE(m.lastReadAt, cr.createdAt)")
    long countUnreadRooms(@Param("userId") Long userId);

}
