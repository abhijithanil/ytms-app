package com.insp17.ytms.config;

import com.insp17.ytms.entity.OnlineUser;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class Config {

    @Bean
    public Map<String, OnlineUser> getOnlineUsersBean() {
        return new ConcurrentHashMap<String, OnlineUser>();
    }
}
