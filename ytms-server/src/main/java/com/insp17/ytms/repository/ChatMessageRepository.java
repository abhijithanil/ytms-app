package com.insp17.ytms.repository;

import com.insp17.ytms.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Changed from Desc to Asc for chronological order (oldest first)
    List<ChatMessage> findByTaskIdOrderByCreatedAtAsc(Long taskId, Pageable pageable);

    // Add this method for global messages in ascending order
    @Query("SELECT m FROM ChatMessage m WHERE m.taskId IS NULL ORDER BY m.createdAt ASC")
    List<ChatMessage> findGlobalChatMessagesOrderByCreatedAtAsc(Pageable pageable);

    // If you have existing methods with Desc, keep them for backwards compatibility
    // but add the new Asc versions above
    List<ChatMessage> findByTaskIdOrderByCreatedAtDesc(Long taskId, Pageable pageable);

    @Query("SELECT m FROM ChatMessage m WHERE m.taskId IS NULL ORDER BY m.createdAt DESC")
    List<ChatMessage> findGlobalChatMessages(Pageable pageable);

    // Count methods remain the same
    long countByTaskId(Long taskId);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.taskId IS NULL")
    long countGlobalMessages();
}