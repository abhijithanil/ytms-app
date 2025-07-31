package com.insp17.ytms.dtos;

import com.insp17.ytms.entity.UserRole;
import com.insp17.ytms.gson.GsonUtil;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InviteRequest {
    private String email;
    private UserRole userRole;
    private long invitedBy;

    @Override
    public String toString() {
        return GsonUtil.toJsonString(this);
    }
}
