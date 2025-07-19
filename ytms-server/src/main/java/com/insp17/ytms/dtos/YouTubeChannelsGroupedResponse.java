package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class YouTubeChannelsGroupedResponse {
    private boolean success;
    private String message;
    private List<YouTubeAccountGroup> accounts = new ArrayList<>();

}