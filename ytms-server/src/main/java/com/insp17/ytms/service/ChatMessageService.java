package com.insp17.ytms.service;

import com.insp17.ytms.dtos.ChatMessageDTO;
import com.insp17.ytms.dtos.SendMessageRequest;
import com.insp17.ytms.entity.ChatChannel;
import com.insp17.ytms.entity.ChatMessage;
import com.insp17.ytms.entity.User;
import com.insp17.ytms.repository.ChatMessageRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ChatMessageService {

    @Autowired
    private ChatMessageRepository messageRepository;

    @Autowired
    private ChatChannelService channelService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public ChatMessage sendMessage(Long channelId, SendMessageRequest request, User sender) {
        ChatChannel channel = channelService.getChannelById(channelId);

        ChatMessage.MessageType messageType;
        try {
            messageType = ChatMessage.MessageType.valueOf(
                request.getMessageType() != null ? request.getMessageType().toUpperCase() : "TEXT"
            );
        } catch (Exception e) {
            messageType = ChatMessage.MessageType.TEXT;
        }

        ChatMessage message = new ChatMessage(
                request.getContent(),
                sender,
                channel,
                messageType
        );

        // Handle threading
        if (request.getParentMessageId() != null) {
            ChatMessage parentMessage = messageRepository.findById(request.getParentMessageId())
                    .orElse(null);
            message.setParentMessage(parentMessage);
        }

        message = messageRepository.save(message);

        // Send real-time update to channel subscribers
        ChatMessageDTO messageDTO = new ChatMessageDTO(message);
        messagingTemplate.convertAndSend("/topic/channel/" + channelId, messageDTO);

        return message;
    }

    public List<ChatMessageDTO> getChannelMessages(Long channelId, int limit) {
        ChatChannel channel = channelService.getChannelById(channelId);
        List<ChatMessage> messages = messageRepository.findByChannelAndIsDeletedFalseOrderByCreatedAtDesc(channel);
        
        return messages.stream()
                .limit(limit)
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());
    }

    public Page<ChatMessageDTO> getChannelMessagesPageable(Long channelId, Pageable pageable) {
        ChatChannel channel = channelService.getChannelById(channelId);
        Page<ChatMessage> messages = messageRepository.findByChannelAndIsDeletedFalseOrderByCreatedAtDesc(channel, pageable);
        
        return messages.map(ChatMessageDTO::new);
    }

    public ChatMessage editMessage(Long messageId, String newContent, User editor) {
        ChatMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getSender().getId().equals(editor.getId())) {
            throw new RuntimeException("Can only edit your own messages");
        }

        message.setContent(newContent);
        message = messageRepository.save(message);

        // Send real-time update
        ChatMessageDTO messageDTO = new ChatMessageDTO(message);
        messagingTemplate.convertAndSend("/topic/channel/" + message.getChannel().getId(), messageDTO);

        return message;
    }

    public void deleteMessage(Long messageId, User deleter) {
        ChatMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getSender().getId().equals(deleter.getId())) {
            throw new RuntimeException("Can only delete your own messages");
        }

        message.setDeleted(true);
        message.setContent("[Message deleted]");
        messageRepository.save(message);

        // Send real-time update
        ChatMessageDTO messageDTO = new ChatMessageDTO(message);
        messagingTemplate.convertAndSend("/topic/channel/" + message.getChannel().getId(), messageDTO);
    }

    public List<ChatMessageDTO> searchMessages(Long channelId, String searchTerm) {
        List<ChatMessage> messages = messageRepository.searchInChannel(channelId, searchTerm);
        return messages.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());
    }

    public List<ChatMessageDTO> getMessageReplies(Long messageId) {
        ChatMessage parentMessage = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        
        List<ChatMessage> replies = messageRepository.findByParentMessageAndIsDeletedFalseOrderByCreatedAtAsc(parentMessage);
        return replies.stream()
                .map(ChatMessageDTO::new)
                .collect(Collectors.toList());
    }
}