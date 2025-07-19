package com.insp17.ytms.service;

import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import com.google.cloud.secretmanager.v1.SecretVersionName;
import com.insp17.ytms.dtos.ChannelSetupStatusDTO;
import com.insp17.ytms.dtos.CreateYouTubeChannelRequest;
import com.insp17.ytms.dtos.UpdateYouTubeChannelRequest;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserRole;
import com.insp17.ytms.entity.YouTubeChannel;
import com.insp17.ytms.repository.UserRepository;
import com.insp17.ytms.repository.YouTubeChannelRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class YouTubeChannelService {

    @Autowired
    private YouTubeChannelRepository youTubeChannelRepository;


    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SecretManagerServiceClient secretManagerServiceClient;

    @Autowired
    private YouTubeService youTubeService;

    @Value("${gcp.project-id}")
    private String projectId;


    /**
     * Create or update a YouTube channel
     */
    public YouTubeChannel createOrUpdateChannel(String channelName, String channelId,
                                                String channelUrl, String thumbnailUrl,
                                                String ownerEmail, User addedBy) {
        log.info("Creating/updating YouTube channel: {} for account: {}", channelName, ownerEmail);

        // Check if channel already exists
        Optional<YouTubeChannel> existingChannel = youTubeChannelRepository
                .findByChannelIdAndIsActiveTrue(channelId);

        if (existingChannel.isPresent()) {
            // Update existing channel
            YouTubeChannel channel = existingChannel.get();
            channel.setChannelName(channelName);
            channel.setChannelUrl(channelUrl);
            channel.setThumbnailUrl(thumbnailUrl);
            channel.setYoutubeChannelOwnerEmail(ownerEmail);
            channel.setUpdatedAt(LocalDateTime.now());

            return youTubeChannelRepository.save(channel);
        } else {
            // Create new channel
            YouTubeChannel channel = new YouTubeChannel(
                    channelName,
                    channelId,
                    channelUrl,
                    addedBy,
                    ownerEmail
            );
            channel.setThumbnailUrl(thumbnailUrl);

            return youTubeChannelRepository.save(channel);
        }
    }

    /**
     * Get all channels for a specific YouTube account email
     */
    public List<YouTubeChannel> getChannelsByOwnerEmail(String ownerEmail) {
        return youTubeChannelRepository.findByYoutubeChannelOwnerEmailAndIsActiveTrue(ownerEmail);
    }

    /**
     * Get channels grouped by owner email for user
     */
    public Map<String, List<YouTubeChannel>> getChannelsGroupedByOwner(Long userId) {
        List<YouTubeChannel> accessibleChannels = getChannelsAccessibleByUser(userId);

        return accessibleChannels.stream()
                .collect(Collectors.groupingBy(YouTubeChannel::getYoutubeChannelOwnerEmail));
    }

    /**
     * Validate if a channel belongs to a specific YouTube account
     */
    public boolean isChannelOwnedByAccount(Long channelId, String ownerEmail) {
        YouTubeChannel channel = youTubeChannelRepository.findById(channelId)
                .orElseThrow(() -> new RuntimeException("Channel not found"));

        return channel.getYoutubeChannelOwnerEmail().equals(ownerEmail);
    }

    public List<YouTubeChannel> getAllActiveChannels() {
        return youTubeChannelRepository.findByIsActiveTrue();
    }

    public List<YouTubeChannel> getChannelsAccessibleByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Admins can see all channels
        if (user.getRole() == UserRole.ADMIN) {
            return getAllActiveChannels();
        }

        return youTubeChannelRepository.findChannelsAccessibleByUser(userId);
    }

    public Optional<YouTubeChannel> getChannelById(Long channelId) {
        return youTubeChannelRepository.findById(channelId);
    }

    public Optional<YouTubeChannel> getChannelByChannelId(String channelId) {
        return youTubeChannelRepository.findByChannelIdAndIsActiveTrue(channelId);
    }

    public YouTubeChannel createChannel(CreateYouTubeChannelRequest request, User addedBy) {
        log.info("Creating YouTube channel: {} by user: {}", request.getChannelName(), addedBy.getUsername());

        // Validate that channel doesn't already exist
        if (youTubeChannelRepository.existsByChannelId(request.getChannelId())) {
            throw new RuntimeException("Channel with this Channel ID already exists");
        }

        if (youTubeChannelRepository.existsByChannelName(request.getChannelName())) {
            throw new RuntimeException("Channel with this name already exists");
        }

        YouTubeChannel channel = new YouTubeChannel(
                request.getChannelName(),
                request.getChannelId(),
                request.getChannelUrl(),
                addedBy,
                request.getYoutubeChannelOwnerEmail()
        );

        channel.setDescription(request.getDescription());
        channel.setThumbnailUrl(request.getThumbnailUrl());

        // Set custom refresh token key if provided, otherwise use default
        if (request.getRefreshTokenKey() != null && !request.getRefreshTokenKey().trim().isEmpty()) {
            channel.setRefreshTokenKey(request.getRefreshTokenKey());
        }
        // Default is set in the constructor

        // Set user access
        if (request.getUsersWithAccess() != null && !request.getUsersWithAccess().isEmpty()) {
            for (Long userId : request.getUsersWithAccess()) {
                if (!userRepository.existsById(userId)) {
                    throw new RuntimeException("User with ID " + userId + " not found");
                }
                channel.addUserAccess(userId);
            }
        }

        YouTubeChannel savedChannel = youTubeChannelRepository.save(channel);
        log.info("Successfully created YouTube channel with ID: {} and refresh token key: {}",
                savedChannel.getId(), savedChannel.getRefreshTokenKey());

        return savedChannel;
    }

    public List<ChannelSetupStatusDTO> getChannelSetupStatus() {
        List<YouTubeChannel> channels = getAllActiveChannels();
        return channels.stream().map(this::checkChannelSetupStatus).toList();
    }

    private ChannelSetupStatusDTO checkChannelSetupStatus(YouTubeChannel channel) {
        ChannelSetupStatusDTO status = new ChannelSetupStatusDTO();
        status.setChannelId(channel.getId());
        status.setChannelName(channel.getChannelName());
        status.setYoutubeChannelOwnerEmail(channel.getYoutubeChannelOwnerEmail());
        status.setRefreshTokenKey(channel.getRefreshTokenKey());
        status.setSetupUrl("/oauth/start-youtube-setup/" + channel.getId());

        try {
            // Check if refresh token exists in Secret Manager
            boolean hasToken = checkRefreshTokenExists(channel.getRefreshTokenKey());
            status.setHasRefreshToken(hasToken);

            if (hasToken) {
                // Test if token works by making API call
                boolean tokenWorks = youTubeService.testChannelConnection(channel);
                status.setTokenWorking(tokenWorks);

                if (tokenWorks) {
                    status.setStatus("READY");
                    status.setMessage("Channel is ready for uploads");
                } else {
                    status.setStatus("TOKEN_EXPIRED");
                    status.setMessage("Refresh token exists but is not working. Re-authorization needed.");
                }
            } else {
                status.setTokenWorking(false);
                status.setStatus("NEEDS_SETUP");
                status.setMessage("No refresh token found. OAuth setup required.");
            }
        } catch (Exception e) {
            status.setHasRefreshToken(false);
            status.setTokenWorking(false);
            status.setStatus("ERROR");
            status.setMessage("Error checking token status: " + e.getMessage());
        }

        return status;
    }

    private boolean checkRefreshTokenExists(String refreshTokenKey) {
        try {
            SecretVersionName secretVersionName = SecretVersionName.of(projectId, refreshTokenKey, "latest");
            secretManagerServiceClient.accessSecretVersion(secretVersionName);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public YouTubeChannel updateChannel(Long channelId, UpdateYouTubeChannelRequest request, User updatedBy) {
        log.info("Updating YouTube channel: {} by user: {}", channelId, updatedBy.getUsername());

        YouTubeChannel channel = youTubeChannelRepository.findById(channelId)
                .orElseThrow(() -> new RuntimeException("YouTube channel not found"));

        // Check if user has permission to update
        if (!canUserModifyChannel(channel, updatedBy)) {
            throw new RuntimeException("User does not have permission to modify this channel");
        }

        // Update fields if provided
        if (request.getChannelName() != null) {
            // Check if new name conflicts with existing channels
            if (youTubeChannelRepository.existsByChannelName(request.getChannelName()) &&
                    !channel.getChannelName().equals(request.getChannelName())) {
                throw new RuntimeException("Channel with this name already exists");
            }
            channel.setChannelName(request.getChannelName());
        }

        if (request.getDescription() != null) {
            channel.setDescription(request.getDescription());
        }

        if (request.getChannelUrl() != null) {
            channel.setChannelUrl(request.getChannelUrl());
        }

        if (request.getThumbnailUrl() != null) {
            channel.setThumbnailUrl(request.getThumbnailUrl());
        }

        if (request.getUsersWithAccess() != null) {
            // Clear existing access and set new ones
            channel.getUsersWithAccess().clear();
            for (Long userId : request.getUsersWithAccess()) {
                if (!userRepository.existsById(userId)) {
                    throw new RuntimeException("User with ID " + userId + " not found");
                }
                channel.addUserAccess(userId);
            }
        }

        if (request.getIsActive() != null) {
            channel.setIsActive(request.getIsActive());
        }

        channel.setUpdatedAt(LocalDateTime.now());
        YouTubeChannel savedChannel = youTubeChannelRepository.save(channel);

        log.info("Successfully updated YouTube channel with ID: {}", savedChannel.getId());
        return savedChannel;
    }

    public void deleteChannel(Long channelId, User deletedBy) {
        log.info("Deleting YouTube channel: {} by user: {}", channelId, deletedBy.getUsername());

        YouTubeChannel channel = youTubeChannelRepository.findById(channelId)
                .orElseThrow(() -> new RuntimeException("YouTube channel not found"));

        // Check if user has permission to delete
        if (!canUserModifyChannel(channel, deletedBy)) {
            throw new RuntimeException("User does not have permission to delete this channel");
        }

        // Soft delete - set isActive to false
        channel.setIsActive(false);
        channel.setUpdatedAt(LocalDateTime.now());
        youTubeChannelRepository.delete(channel);

        log.info("Successfully deleted (soft) YouTube channel with ID: {}", channelId);
    }

    public void addUserAccess(Long channelId, List<Long> userIds, User modifiedBy) {
        log.info("Adding user access to channel: {} by user: {}", channelId, modifiedBy.getUsername());

        YouTubeChannel channel = youTubeChannelRepository.findById(channelId)
                .orElseThrow(() -> new RuntimeException("YouTube channel not found"));

        if (!canUserModifyChannel(channel, modifiedBy)) {
            throw new RuntimeException("User does not have permission to modify channel access");
        }

        for (Long userId : userIds) {
            if (!userRepository.existsById(userId)) {
                throw new RuntimeException("User with ID " + userId + " not found");
            }
            channel.addUserAccess(userId);
        }

        channel.setUpdatedAt(LocalDateTime.now());
        youTubeChannelRepository.save(channel);

        log.info("Successfully added user access to channel: {}", channelId);
    }

    public void removeUserAccess(Long channelId, List<Long> userIds, User modifiedBy) {
        log.info("Removing user access from channel: {} by user: {}", channelId, modifiedBy.getUsername());

        YouTubeChannel channel = youTubeChannelRepository.findById(channelId)
                .orElseThrow(() -> new RuntimeException("YouTube channel not found"));

        if (!canUserModifyChannel(channel, modifiedBy)) {
            throw new RuntimeException("User does not have permission to modify channel access");
        }

        for (Long userId : userIds) {
            channel.removeUserAccess(userId);
        }

        channel.setUpdatedAt(LocalDateTime.now());
        youTubeChannelRepository.save(channel);

        log.info("Successfully removed user access from channel: {}", channelId);
    }

    public boolean canUserAccessChannel(Long channelId, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Admins can access all channels
        if (user.getRole() == UserRole.ADMIN) {
            return true;
        }

        YouTubeChannel channel = youTubeChannelRepository.findById(channelId)
                .orElseThrow(() -> new RuntimeException("YouTube channel not found"));

        // Channel creator can always access
        if (channel.getAddedBy().getId().equals(userId)) {
            return true;
        }

        // Check if user has explicit access
        return channel.hasUserAccess(userId);
    }

    public boolean canUserModifyChannel(YouTubeChannel channel, User user) {
        // Admins can modify all channels
        if (user.getRole() == UserRole.ADMIN) {
            return true;
        }

        // Channel creator can modify
        return channel.getAddedBy().getId().equals(user.getId());
    }

    public List<YouTubeChannel> searchChannels(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return getAllActiveChannels();
        }
        return youTubeChannelRepository.findByChannelNameContainingIgnoreCase(searchTerm.trim());
    }

    public long getActiveChannelsCount() {
        return youTubeChannelRepository.countActiveChannels();
    }

    public List<YouTubeChannel> getChannelsByUser(Long userId) {
        return youTubeChannelRepository.findByAddedByIdAndIsActiveTrue(userId);
    }
}