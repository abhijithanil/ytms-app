package com.insp17.ytms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchOperationResponse {
    private Integer totalRequested;
    private Integer successful;
    private Integer failed;
    private List<String> errors;
    private List<Long> failedMessageIds;
}
