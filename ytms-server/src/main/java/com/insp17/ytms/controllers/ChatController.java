package com.insp17.ytms.controllers;

import com.insp17.ytms.dtos.*;
import com.insp17.ytms.entity.ChatMessage;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.entity.UserChannelMembership;
import com.insp17.ytms.service.ChatChannelService;
import com.insp17.ytms.service.ChatMessageService;
import com.insp17.ytms.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatChannelService channelService;

    @Autowired
    private ChatMessageService messageService;

    @Autowired
    private UserService userService;

    // Channel endpoints
    @PostMapping("/channels")
    public ResponseEntity<ChatChannelDTO> createChannel(@RequestBody CreateChannelRequest request, 
                                                       @CurrentUser UserPrincipal userPrincipal) {
        User creator = userService.getUserById(userPrincipal.getId());
        var channel = channelService.createChannel(request, creator);
        return ResponseEntity.ok(new ChatChannelDTO(channel));
    }

    @GetMapping("/channels")
    public ResponseEntity<List<ChatChannelDTO>> getUserChannels(@CurrentUser UserPrincipal userPrincipal) {
        List<ChatChannelDTO> channels = channelService.getUserChannels(userPrincipal.getId());
        return ResponseEntity.ok(channels);
    }

    @GetMapping("/channels/public")
    public ResponseEntity<List<ChatChannelDTO>> getPublicChannels() {
        List<ChatChannelDTO> channels = channelService.getPublicChannels();
        return ResponseEntity.ok(channels);
    }

    @PostMapping("/channels/{channelId}/join")
    public ResponseEntity<Void> joinChannel(@PathVariable Long channelId, 
                                          @CurrentUser UserPrincipal userPrincipal) {
        channelService.joinChannel(userPrincipal.getId(), channelId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/channels/{channelId}/leave")
    public ResponseEntity<Void> leaveChannel(@PathVariable Long channelId, 
                                           @CurrentUser UserPrincipal userPrincipal) {
        channelService.leaveChannel(userPrincipal.getId(), channelId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/channels/{channelId}/members")
    public ResponseEntity<List<UserSummary>> getChannelMembers(@PathVariable Long channelId,
                                                              @CurrentUser UserPrincipal userPrincipal) {
        if (!channelService.isUserMemberOfChannel(userPrincipal.getId(), channelId)) {
            return ResponseEntity.status(403).build();
        }

        List<UserChannelMembership> memberships = channelService.getChannelMembers(channelId);
        List<UserSummary> members = memberships.stream()
                .map(membership -> new UserSummary(membership.getUser()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(members);
    }

    // Message endpoints
    @PostMapping("/channels/{channelId}/messages")
    public ResponseEntity<ChatMessageDTO> sendMessage(@PathVariable Long channelId,
                                                     @RequestBody SendMessageRequest request,
                                                     @CurrentUser UserPrincipal userPrincipal) {
        if (!channelService.isUserMemberOfChannel(userPrincipal.getId(), channelId)) {
            return ResponseEntity.status(403).build();
        }

        User sender = userService.getUserById(userPrincipal.getId());
        ChatMessage message = messageService.sendMessage(channelId, request, sender);
        return ResponseEntity.ok(new ChatMessageDTO(message));
    }

    @GetMapping("/channels/{channelId}/messages")
    public ResponseEntity<List<ChatMessageDTO>> getMessages(@PathVariable Long channelId,
                                                           @RequestParam(defaultValue = "50") int limit,
                                                           @CurrentUser UserPrincipal userPrincipal) {
        if (!channelService.isUserMemberOfChannel(userPrincipal.getId(), channelId)) {
            return ResponseEntity.status(403).build();
        }

        List<ChatMessageDTO> messages = messageService.getChannelMessages(channelId, limit);
        return ResponseEntity.ok(messages);
    }

    @GetMapping("/channels/{channelId}/messages/pageable")
    public ResponseEntity<Page<ChatMessageDTO>> getMessagesPageable(@PathVariable Long channelId,
                                                                   @RequestParam(defaultValue = "0") int page,
                                                                   @RequestParam(defaultValue = "20") int size,
                                                                   @CurrentUser UserPrincipal userPrincipal) {
        if (!channelService.isUserMemberOfChannel(userPrincipal.getId(), channelId)) {
            return ResponseEntity.status(403).build();
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessageDTO> messages = messageService.getChannelMessagesPageable(channelId, pageable);
        return ResponseEntity.ok(messages);
    }

    @PutMapping("/messages/{messageId}")
    public ResponseEntity<ChatMessageDTO> editMessage(@PathVariable Long messageId,
                                                     @RequestBody SendMessageRequest request,
                                                     @CurrentUser UserPrincipal userPrincipal) {
        User editor = userService.getUserById(userPrincipal.getId());
        ChatMessage message = messageService.editMessage(messageId, request.getContent(), editor);
        return ResponseEntity.ok(new ChatMessageDTO(message));
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long messageId,
                                             @CurrentUser UserPrincipal userPrincipal) {
        User deleter = userService.getUserById(userPrincipal.getId());
        messageService.deleteMessage(messageId, deleter);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/channels/{channelId}/messages/search")
    public ResponseEntity<List<ChatMessageDTO>> searchMessages(@PathVariable Long channelId,
                                                              @RequestParam String query,
                                                              @CurrentUser UserPrincipal userPrincipal) {
        if (!channelService.isUserMemberOfChannel(userPrincipal.getId(), channelId)) {
            return ResponseEntity.status(403).build();
        }

        List<ChatMessageDTO> messages = messageService.searchMessages(channelId, query);
        return ResponseEntity.ok(messages);
    }

    @GetMapping("/messages/{messageId}/replies")
    public ResponseEntity<List<ChatMessageDTO>> getMessageReplies(@PathVariable Long messageId,
                                                                 @CurrentUser UserPrincipal userPrincipal) {
        List<ChatMessageDTO> replies = messageService.getMessageReplies(messageId);
        return ResponseEntity.ok(replies);
    }
}