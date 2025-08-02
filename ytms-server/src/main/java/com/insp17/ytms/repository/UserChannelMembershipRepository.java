package com.insp17.ytms.repository;

import com.insp17.ytms.entity.ChatChannel;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserChannelMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserChannelMembershipRepository extends JpaRepository<UserChannelMembership, Long> {
    
    Optional<UserChannelMembership> findByUserAndChannel(User user, ChatChannel channel);
    
    List<UserChannelMembership> findByUser(User user);
    
    List<UserChannelMembership> findByChannel(ChatChannel channel);
    
    List<UserChannelMembership> findByChannelOrderByJoinedAtAsc(ChatChannel channel);
    
    @Query("SELECT m FROM UserChannelMembership m WHERE m.user.id = :userId " +
           "ORDER BY m.joinedAt DESC")
    List<UserChannelMembership> findByUserId(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(m) FROM UserChannelMembership m WHERE m.channel = :channel")
    Long countMembersByChannel(@Param("channel") ChatChannel channel);
    
    boolean existsByUserAndChannel(User user, ChatChannel channel);
    
    void deleteByUserAndChannel(User user, ChatChannel channel);
}