package com.insp17.ytms.repository;

import com.insp17.ytms.entity.YouTubeChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface YouTubeChannelRepository extends JpaRepository<YouTubeChannel, Long> {

    List<YouTubeChannel> findByIsActiveTrue();

    List<YouTubeChannel> findByAddedByIdAndIsActiveTrue(Long addedById);

    Optional<YouTubeChannel> findByChannelIdAndIsActiveTrue(String channelId);

    Optional<YouTubeChannel> findByChannelNameAndIsActiveTrue(String channelName);

    boolean existsByChannelId(String channelId);

    boolean existsByChannelName(String channelName);

    @Query("SELECT yc FROM YouTubeChannel yc WHERE yc.isActive = true AND " +
            "(yc.addedBy.id = :userId OR :userId MEMBER OF yc.usersWithAccess)")
    List<YouTubeChannel> findChannelsAccessibleByUser(@Param("userId") Long userId);

    @Query("SELECT yc FROM YouTubeChannel yc WHERE yc.isActive = true AND " +
            ":userId MEMBER OF yc.usersWithAccess")
    List<YouTubeChannel> findChannelsWithUserAccess(@Param("userId") Long userId);

    @Query("SELECT COUNT(yc) FROM YouTubeChannel yc WHERE yc.isActive = true")
    long countActiveChannels();

    @Query("SELECT yc FROM YouTubeChannel yc WHERE yc.isActive = true AND " +
            "LOWER(yc.channelName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<YouTubeChannel> findByChannelNameContainingIgnoreCase(@Param("searchTerm") String searchTerm);
}