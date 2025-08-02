package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageSearchResponse {
    private List<ChatMessageDTO> messages;
    private int totalResults;
    private int page;
    private int size;
    private boolean hasMore;
    private String query;
    private Long totalPages;
}