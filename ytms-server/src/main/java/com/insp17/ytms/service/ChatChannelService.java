package com.insp17.ytms.service;

import com.insp17.ytms.dtos.ChatChannelDTO;
import com.insp17.ytms.dtos.CreateChannelRequest;
import com.insp17.ytms.entity.ChatChannel;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserChannelMembership;
import com.insp17.ytms.repository.ChatChannelRepository;
import com.insp17.ytms.repository.UserChannelMembershipRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ChatChannelService {

    @Autowired
    private ChatChannelRepository channelRepository;

    @Autowired
    private UserChannelMembershipRepository membershipRepository;

    public ChatChannel createChannel(CreateChannelRequest request, User creator) {
        ChatChannel.ChannelType type;
        try {
            type = ChatChannel.ChannelType.valueOf(request.getType().toUpperCase());
        } catch (Exception e) {
            type = ChatChannel.ChannelType.GENERAL;
        }

        ChatChannel channel = new ChatChannel(
                request.getName(),
                request.getDescription(),
                type,
                creator,
                request.isPrivate()
        );

        channel = channelRepository.save(channel);

        // Automatically add creator as owner
        UserChannelMembership membership = new UserChannelMembership(
                creator, 
                channel, 
                UserChannelMembership.MembershipRole.OWNER
        );
        membershipRepository.save(membership);

        return channel;
    }

    public List<ChatChannelDTO> getUserChannels(Long userId) {
        List<ChatChannel> channels = channelRepository.findChannelsByUserId(userId);
        return channels.stream()
                .map(channel -> {
                    ChatChannelDTO dto = new ChatChannelDTO(channel);
                    dto.setMemberCount(membershipRepository.countMembersByChannel(channel));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<ChatChannelDTO> getPublicChannels() {
        List<ChatChannel> channels = channelRepository.findByIsPrivateFalseOrderByCreatedAtDesc();
        return channels.stream()
                .map(channel -> {
                    ChatChannelDTO dto = new ChatChannelDTO(channel);
                    dto.setMemberCount(membershipRepository.countMembersByChannel(channel));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public ChatChannel getChannelById(Long channelId) {
        return channelRepository.findById(channelId)
                .orElseThrow(() -> new RuntimeException("Channel not found"));
    }

    public boolean isUserMemberOfChannel(Long userId, Long channelId) {
        ChatChannel channel = getChannelById(channelId);
        User user = new User();
        user.setId(userId);
        return membershipRepository.existsByUserAndChannel(user, channel);
    }

    public void joinChannel(Long userId, Long channelId) {
        ChatChannel channel = getChannelById(channelId);
        User user = new User();
        user.setId(userId);

        if (!membershipRepository.existsByUserAndChannel(user, channel)) {
            UserChannelMembership membership = new UserChannelMembership(
                    user, 
                    channel, 
                    UserChannelMembership.MembershipRole.MEMBER
            );
            membershipRepository.save(membership);
        }
    }

    public void leaveChannel(Long userId, Long channelId) {
        ChatChannel channel = getChannelById(channelId);
        User user = new User();
        user.setId(userId);
        membershipRepository.deleteByUserAndChannel(user, channel);
    }

    public List<UserChannelMembership> getChannelMembers(Long channelId) {
        ChatChannel channel = getChannelById(channelId);
        return membershipRepository.findByChannelOrderByJoinedAtAsc(channel);
    }
}