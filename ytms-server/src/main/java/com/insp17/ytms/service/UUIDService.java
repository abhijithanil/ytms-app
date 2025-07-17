package com.insp17.ytms.service;

import com.insp17.ytms.dtos.InviteRequest;
import com.insp17.ytms.gson.GsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class UUIDService {
    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String MFA_PREFIX = "MFA-";

    public String generateVerificationToken(String email) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set("token:" + token, email, 30, TimeUnit.MINUTES); // Store for 30 mins
        return token;
    }

    public String generateOTP(String email) {
        String otp = String.valueOf(1000 + new SecureRandom().nextInt(9000));
        redisTemplate.opsForValue().set("otp:" + email, otp, 5, TimeUnit.MINUTES); // Store for 5 mins
        return otp;
    }

    public Map<String, String> createUserInviteRequest(InviteRequest inviteRequest) {
        Map<String, String> re = new HashMap<>();
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(token, inviteRequest.toString(), 4, TimeUnit.HOURS);
        re.put("token", token);
        re.put("url", generateInviteUrl(token));
        return re;
    }

    public void removeInviteRequest(String token) {
        redisTemplate.delete(token);
    }

    private String generateInviteUrl(String token) {
        return "http://localhost:3000/invite/" + token;
    }

    public String getOTPFromEmail(String email) {
        return redisTemplate.opsForValue().get("otp:" + email);
    }

    public String getEmailFromToken(String token) {
        return redisTemplate.opsForValue().get("token:" + token);
    }

    public void removeToken(String token) {
        redisTemplate.delete("token:" + token);
    }

    public void removeOTP(String emailId) {
        redisTemplate.delete("otp:" + emailId);
    }

    public Boolean validateUserInviteRequest(String token) {
        String s = redisTemplate.opsForValue().get(token);
        if (s == null) {
            return false;
        }
        return true;
    }

    public Optional<InviteRequest> getUserInviteRequest(String token) {
        String val = redisTemplate.opsForValue().get(token);
        if (val == null) {
            return Optional.empty();
        }
        return Optional.of(GsonUtil.fromJsonString(val, InviteRequest.class));
    }

    public void saveUserMFASecretTemp(String uid, String secret) {
        String key = MFA_PREFIX + uid;
        redisTemplate.opsForValue().set(key, secret);
    }

    public String fetchAndDeleteUserMFASecretTemp(String uid) {
        String key = MFA_PREFIX + uid;
        return redisTemplate.opsForValue().getAndDelete(key);
    }
}
