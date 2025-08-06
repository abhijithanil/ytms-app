package com.insp17.ytms.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.HashSet;
import java.util.Objects;

@Entity
@Table(name = "chat_rooms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true) // Only use explicitly included fields
public class ChatRoom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include // Include ID in equals/hashCode
    private Long id;

    @Column(name = "room_name", nullable = false)
    private String roomName;

    @Column(name = "room_description")
    private String roomDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false)
    private RoomType roomType;

    @Column(name = "is_private", nullable = false)
    private Boolean isPrivate = false;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "is_archived")
    private Boolean isArchived = false;

    // For direct messages, this stores the other user's ID
    @Column(name = "dm_participant_id")
    private Long dmParticipantId;

    // For task-related rooms
    @Column(name = "task_id")
    private Long taskId;

    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<ChatRoomMember> members = new HashSet<>();

    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<ChatMessage> messages = new HashSet<>();

    public enum RoomType {
        DIRECT_MESSAGE,     // 1-on-1 chat
        GROUP_CHAT,         // Group chat
        TASK_CHAT,          // Task-specific chat
        GLOBAL_CHAT         // General team chat
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper methods
    public boolean isDirectMessage() {
        return roomType == RoomType.DIRECT_MESSAGE;
    }

    public boolean isGroupChat() {
        return roomType == RoomType.GROUP_CHAT;
    }

    public boolean isTaskChat() {
        return roomType == RoomType.TASK_CHAT;
    }

    // Generate room name for DMs
    public static String generateDMRoomName(String user1, String user2) {
        return user1.compareTo(user2) < 0 ? user1 + "<>" + user2 : user2 + "<>" + user1;
    }

    // Custom equals and hashCode to avoid collection access
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ChatRoom)) return false;
        ChatRoom chatRoom = (ChatRoom) o;
        return Objects.equals(id, chatRoom.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "ChatRoom{" +
                "id=" + id +
                ", roomName='" + roomName + '\'' +
                ", roomType=" + roomType +
                ", isPrivate=" + isPrivate +
                ", createdBy=" + createdBy +
                ", createdAt=" + createdAt +
                '}';
    }
}