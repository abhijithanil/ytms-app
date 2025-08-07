package com.insp17.ytms.repositories;

import com.insp17.ytms.entity.ChatMessage;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
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

    // FIXED: Find latest message in room - return List instead of Optional with Pageable
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findLatestMessageInRoom(@Param("roomId") Long roomId, Pageable pageable);

    // Alternative method without Pageable for getting single latest message
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "ORDER BY cm.createdAt DESC LIMIT 1")
    Optional<ChatMessage> findLatestMessageInRoomOptional(@Param("roomId") Long roomId);

    // Get message count in room
    long countByChatRoomIdAndIsDeletedFalse(Long roomId);

    // Additional helper methods for better performance

    // Find latest message without pagination (more efficient for single result)
    @Query(value = "SELECT cm.* FROM chat_messages cm WHERE cm.chat_room_id = :roomId AND cm.is_deleted = false " +
            "ORDER BY cm.created_at DESC LIMIT 1", nativeQuery = true)
    Optional<ChatMessage> findTopByChatRoomIdAndIsDeletedFalseOrderByCreatedAtDesc(@Param("roomId") Long roomId);

    // Find messages by sender in room
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.senderId = :senderId " +
            "AND cm.isDeleted = false ORDER BY cm.createdAt DESC")
    List<ChatMessage> findByChatRoomIdAndSenderIdOrderByCreatedAtDesc(
            @Param("roomId") Long roomId,
            @Param("senderId") Long senderId,
            Pageable pageable);

    // Find messages in room within date range
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "AND cm.createdAt >= :fromDate AND cm.createdAt <= :toDate " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findByChatRoomIdAndCreatedAtBetween(
            @Param("roomId") Long roomId,
            @Param("fromDate") java.time.LocalDateTime fromDate,
            @Param("toDate") java.time.LocalDateTime toDate,
            Pageable pageable);

    // Find all messages by type in room
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.type = :messageType " +
            "AND cm.isDeleted = false ORDER BY cm.createdAt DESC")
    List<ChatMessage> findByChatRoomIdAndTypeOrderByCreatedAtDesc(
            @Param("roomId") Long roomId,
            @Param("messageType") ChatMessage.MessageType messageType,
            Pageable pageable);

    // Global search across all rooms user has access to
    @Query("SELECT cm FROM ChatMessage cm " +
            "JOIN ChatRoomMember m ON m.chatRoom.id = cm.chatRoom.id " +
            "WHERE m.userId = :userId AND cm.isDeleted = false " +
            "AND LOWER(cm.content) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> searchMessagesForUser(
            @Param("userId") Long userId,
            @Param("searchTerm") String searchTerm,
            Pageable pageable);

    // Find messages with attachments in room
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "AND cm.attachmentUrl IS NOT NULL ORDER BY cm.createdAt DESC")
    List<ChatMessage> findMessagesWithAttachmentsInRoom(@Param("roomId") Long roomId, Pageable pageable);

    // Count messages by user in room
    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId " +
            "AND cm.senderId = :userId AND cm.isDeleted = false")
    long countByChatRoomIdAndSenderId(@Param("roomId") Long roomId, @Param("userId") Long userId);


    // Enhanced search with multiple criteria
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id IN :roomIds " +
            "AND cm.isDeleted = false " +
            "AND (:query IS NULL OR LOWER(cm.content) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "AND (:senderId IS NULL OR cm.senderId = :senderId) " +
            "AND (:messageType IS NULL OR cm.type = :messageType) " +
            "AND (:fromDate IS NULL OR cm.createdAt >= :fromDate) " +
            "AND (:toDate IS NULL OR cm.createdAt <= :toDate) " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> searchMessagesWithCriteria(
            @Param("roomIds") List<Long> roomIds,
            @Param("query") String query,
            @Param("senderId") Long senderId,
            @Param("messageType") ChatMessage.MessageType messageType,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable);

    // Count search results
    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.chatRoom.id IN :roomIds " +
            "AND cm.isDeleted = false " +
            "AND (:query IS NULL OR LOWER(cm.content) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "AND (:senderId IS NULL OR cm.senderId = :senderId) " +
            "AND (:messageType IS NULL OR cm.type = :messageType) " +
            "AND (:fromDate IS NULL OR cm.createdAt >= :fromDate) " +
            "AND (:toDate IS NULL OR cm.createdAt <= :toDate)")
    long countSearchResults(
            @Param("roomIds") List<Long> roomIds,
            @Param("query") String query,
            @Param("senderId") Long senderId,
            @Param("messageType") ChatMessage.MessageType messageType,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate);

    // Get messages before a specific message (for context)
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId " +
            "AND cm.isDeleted = false AND cm.createdAt < :beforeTime " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findMessagesBeforeMessage(
            @Param("roomId") Long roomId,
            @Param("beforeTime") LocalDateTime beforeTime,
            Pageable pageable);

    // Get messages after a specific message (for context)
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId " +
            "AND cm.isDeleted = false AND cm.createdAt > :afterTime " +
            "ORDER BY cm.createdAt ASC")
    List<ChatMessage> findMessagesAfterMessage(
            @Param("roomId") Long roomId,
            @Param("afterTime") LocalDateTime afterTime,
            Pageable pageable);

    // Search messages by sender in specific rooms
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id IN :roomIds " +
            "AND cm.senderId = :senderId AND cm.isDeleted = false " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findMessagesBySenderInRooms(
            @Param("roomIds") List<Long> roomIds,
            @Param("senderId") Long senderId,
            Pageable pageable);

    // Find messages with attachments in user's rooms
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id IN :roomIds " +
            "AND cm.isDeleted = false AND cm.attachmentUrl IS NOT NULL " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findMessagesWithAttachmentsInRooms(
            @Param("roomIds") List<Long> roomIds,
            Pageable pageable);

    // Search messages by content with fuzzy matching
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id IN :roomIds " +
            "AND cm.isDeleted = false " +
            "AND (LOWER(cm.content) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(cm.senderName) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(cm.senderUsername) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> fuzzySearchMessages(
            @Param("roomIds") List<Long> roomIds,
            @Param("query") String query,
            Pageable pageable);

    // Get recent messages across all user rooms (for global search)
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id IN :roomIds " +
            "AND cm.isDeleted = false AND cm.createdAt >= :since " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findRecentMessagesInRooms(
            @Param("roomIds") List<Long> roomIds,
            @Param("since") LocalDateTime since,
            Pageable pageable);

    // Find messages by multiple senders
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id IN :roomIds " +
            "AND cm.senderId IN :senderIds AND cm.isDeleted = false " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findMessagesByMultipleSenders(
            @Param("roomIds") List<Long> roomIds,
            @Param("senderIds") List<Long> senderIds,
            Pageable pageable);

    // Get message statistics for a room
    @Query("SELECT new map(" +
            "COUNT(cm) as totalMessages, " +
            "COUNT(DISTINCT cm.senderId) as uniqueSenders, " +
            "COUNT(CASE WHEN cm.attachmentUrl IS NOT NULL THEN 1 END) as messagesWithAttachments, " +
            "MIN(cm.createdAt) as firstMessageTime, " +
            "MAX(cm.createdAt) as lastMessageTime) " +
            "FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false")
    Map<String, Object> getRoomMessageStatistics(@Param("roomId") Long roomId);


    List<ChatMessage> findMainMessagesByChatRoomIdOrderByCreatedAtAsc(Long roomId, PageRequest pageRequest);

    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "ORDER BY cm.createdAt ASC")
    List<ChatMessage> findByChatRoomIdOrderByCreatedAtAsc(@Param("roomId") Long roomId, Pageable pageable);

    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> findByChatRoomIdOrderByCreatedAtDesc(@Param("roomId") Long roomId, Pageable pageable);

    // Keep the separate method for main messages only (for UI that wants to show only top-level messages)
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "AND cm.parentMessageId IS NULL ORDER BY cm.createdAt ASC")
    List<ChatMessage> findMainMessagesByChatRoomIdOrderByCreatedAtAsc(@Param("roomId") Long roomId, Pageable pageable);

    // search method to include replies
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId AND cm.isDeleted = false " +
            "AND LOWER(cm.content) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "ORDER BY cm.createdAt DESC")
    List<ChatMessage> searchMessagesInRoom(@Param("roomId") Long roomId, @Param("searchTerm") String searchTerm, Pageable pageable);
}