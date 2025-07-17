package com.insp17.ytms.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class MfaEnableResponse {
    private String qrCodeImageUri;
}
