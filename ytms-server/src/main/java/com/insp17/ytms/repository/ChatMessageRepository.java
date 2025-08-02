package com.insp17.ytms.repository;

import com.insp17.ytms.entity.ChatChannel;
import com.insp17.ytms.entity.ChatMessage;
import com.insp17.ytms.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    Page<ChatMessage> findByChannelAndIsDeletedFalseOrderByCreatedAtDesc(ChatChannel channel, Pageable pageable);
    
    List<ChatMessage> findByChannelAndIsDeletedFalseOrderByCreatedAtDesc(ChatChannel channel);
    
    List<ChatMessage> findByChannelAndCreatedAtAfterAndIsDeletedFalseOrderByCreatedAtAsc(
            ChatChannel channel, LocalDateTime after);
    
    @Query("SELECT m FROM ChatMessage m WHERE m.channel.id = :channelId " +
           "AND m.isDeleted = false AND m.content LIKE %:searchTerm% " +
           "ORDER BY m.createdAt DESC")
    List<ChatMessage> searchInChannel(@Param("channelId") Long channelId, 
                                      @Param("searchTerm") String searchTerm);
    
    List<ChatMessage> findByParentMessageAndIsDeletedFalseOrderByCreatedAtAsc(ChatMessage parentMessage);
    
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.channel = :channel AND m.createdAt > :lastRead")
    Long countUnreadMessages(@Param("channel") ChatChannel channel, @Param("lastRead") LocalDateTime lastRead);
    
    List<ChatMessage> findBySenderAndChannelAndIsDeletedFalseOrderByCreatedAtDesc(User sender, ChatChannel channel);
}