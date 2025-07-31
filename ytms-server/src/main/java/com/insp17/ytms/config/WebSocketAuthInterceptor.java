package com.insp17.ytms.config;

import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.security.JwtTokenUtil;
import com.insp17.ytms.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired
    private UserService userService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authToken = accessor.getFirstNativeHeader("Authorization");
            log.info("WebSocket connection attempt with token: {}", authToken);

            if (authToken != null && authToken.startsWith("Bearer ") && !authToken.equals("Bearer undefined")) {
                try {
                    String token = authToken.substring(7);
                    String username = jwtTokenUtil.getUsernameFromToken(token);

                    if (username != null) {
                        UserPrincipal userPrincipal = userService.getUserPrincipal(username);

                        if (jwtTokenUtil.validateToken(token, userPrincipal)) {
                            UsernamePasswordAuthenticationToken authenticationToken =
                                    new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());

                            // Set both SecurityContext and message user
                            SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                            accessor.setUser(authenticationToken);

                            log.info("WebSocket authenticated successfully for user: {} with authorities: {}",
                                    username, userPrincipal.getAuthorities());
                        } else {
                            log.warn("Invalid WebSocket token for user: {}", username);
                            throw new SecurityException("Invalid token");
                        }
                    } else {
                        log.warn("Could not extract username from WebSocket token");
                        throw new SecurityException("Invalid token format");
                    }
                } catch (Exception e) {
                    log.error("WebSocket authentication failed: {}", e.getMessage());
                    throw new SecurityException("Authentication failed: " + e.getMessage());
                }
            } else {
                log.warn("WebSocket connection attempted without valid authorization header");
                throw new SecurityException("Missing or invalid authorization header");
            }
        } else if (accessor.getUser() == null && accessor.getSessionId() != null) {
            // For subsequent messages, try to get user from session attributes if not already set
            log.debug("Message received for session {} without user context", accessor.getSessionId());
        }

        return message;
    }
}