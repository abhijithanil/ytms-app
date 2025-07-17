package com.insp17.ytms.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MfaVerifyCodeRequest {
    private Long userId;
    private String username;
    private int token;
}