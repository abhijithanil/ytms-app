package com.insp17.ytms.dtos;

import java.util.List;

public class ReorderRequest {
    private List<Long> rawVideoIds;

    // Getters and setters
    public List<Long> getRawVideoIds() { return rawVideoIds; }
    public void setRawVideoIds(List<Long> rawVideoIds) { this.rawVideoIds = rawVideoIds; }
}
