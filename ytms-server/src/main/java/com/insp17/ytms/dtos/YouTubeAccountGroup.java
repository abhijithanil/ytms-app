package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class YouTubeAccountGroup {
    private String email;
    private int channelCount;
    private List<YouTubeChannelDTO> channels = new ArrayList<>();
}