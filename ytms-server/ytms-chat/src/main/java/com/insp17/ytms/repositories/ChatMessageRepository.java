package com.insp17.ytms.repositories;

import com.insp17.ytms.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Existing methods for backward compatibility
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.taskId IS NULL AND cm.isDeleted = false ORDER BY cm.createdAt ASC")
    List<ChatMessage> findGlobalChatMessagesOrderByCreatedAtAsc(Pageable pageable);

    @Query("SELECT cm FROM ChatMessage cm WHERE cm.taskId = :taskId AND cm.isDeleted = false ORDER BY cm.createdAt ASC")
    List<ChatMessage> findByTaskIdOrderByCreatedAtAsc(@Param("taskId") Long taskId, Pageable pageable);

    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.taskId IS NULL AND cm.isDeleted = false")
    long countGlobalMessages();

    long countByTaskIdAndIsDeletedFalse(Long taskId);

    // New methods for chat rooms
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "AND cm.parentMessageId IS NULL ORDER BY cm.createdAt ASC")
    List<ChatMessage> findByChatRoomIdOrderByCreatedAtAsc(@Param("roomId") Long roomId, Pageable pageable);

    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findByChatRoomIdOrderByCreatedAtDesc(@Param("roomId") Long roomId, Pageable pageable);

    // Thread messages
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.parentMessageId = :parentId AND cm.isDeleted = false " +
            "ORDER BY cm.createdAt ASC")
    List<ChatMessage> findThreadReplies(@Param("parentId") Long parentId, Pageable pageable);

    // Count unread messages in room for user
    @Query("SELECT COUNT(cm) FROM ChatMessage cm " +
            "JOIN ChatRoomMember m ON m.chatRoom.id = cm.chatRoom.id " +
            "WHERE cm.chatRoom.id = :roomId AND m.userId = :userId AND cm.isDeleted = false " +
            "AND cm.createdAt > COALESCE(m.lastReadAt, m.joinedAt) " +
            "AND cm.senderId != :userId")
    long countUnreadMessages(@Param("roomId") Long roomId, @Param("userId") Long userId);

    // Find latest message in room
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "ORDER BY cm.createdAt DESC")
    Optional<ChatMessage> findLatestMessageInRoom(@Param("roomId") Long roomId, Pageable pageable);

    // Search messages in room
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "AND LOWER(cm.content) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> searchMessagesInRoom(@Param("roomId") Long roomId, @Param("searchTerm") String searchTerm, Pageable pageable);

    // Get message count in room
    long countByChatRoomIdAndIsDeletedFalse(Long roomId);
}
