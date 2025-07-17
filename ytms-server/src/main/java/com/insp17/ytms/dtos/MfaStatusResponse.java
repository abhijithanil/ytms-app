package com.insp17.ytms.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MfaStatusResponse {
    private boolean mfaEnabled;
    private String status;
    private String message;

    public MfaStatusResponse() {}

    public MfaStatusResponse(boolean mfaEnabled, String status) {
        this.mfaEnabled = mfaEnabled;
        this.status = status;
        this.message = mfaEnabled ? "MFA is enabled" : "MFA is disabled";
    }
}
