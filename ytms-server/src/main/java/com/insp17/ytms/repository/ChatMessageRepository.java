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

    List<ChatMessage> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<ChatMessage> findByTaskIdOrderByCreatedAtDesc(@Param("taskId") Long taskId, Pageable pageable);

    @Query("SELECT c FROM ChatMessage c WHERE c.taskId IS NULL ORDER BY c.createdAt DESC")
    List<ChatMessage> findGlobalChatMessages(Pageable pageable);

    @Query("SELECT COUNT(c) FROM ChatMessage c WHERE c.taskId = :taskId")
    long countByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT COUNT(c) FROM ChatMessage c WHERE c.taskId IS NULL")
    long countGlobalMessages();
}