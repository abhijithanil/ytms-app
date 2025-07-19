package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ManageChannelAccessRequest {
    private List<Long> userIds;
    private String action; // "ADD" or "REMOVE"
}