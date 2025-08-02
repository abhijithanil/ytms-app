package com.insp17.ytms.repository;

import com.insp17.ytms.entity.ChatChannel;
import com.insp17.ytms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatChannelRepository extends JpaRepository<ChatChannel, Long> {
    
    Optional<ChatChannel> findByName(String name);
    
    List<ChatChannel> findByIsPrivateFalseOrderByCreatedAtDesc();
    
    List<ChatChannel> findByCreatedByOrderByCreatedAtDesc(User createdBy);
    
    @Query("SELECT c FROM ChatChannel c JOIN UserChannelMembership m ON c.id = m.channel.id " +
           "WHERE m.user.id = :userId ORDER BY c.createdAt DESC")
    List<ChatChannel> findChannelsByUserId(@Param("userId") Long userId);
    
    @Query("SELECT c FROM ChatChannel c WHERE c.type = :type AND c.isPrivate = false " +
           "ORDER BY c.createdAt DESC")
    List<ChatChannel> findByTypeAndPublic(@Param("type") ChatChannel.ChannelType type);
}