package com.insp17.ytms.config;

import com.insp17.ytms.dtos.UserPrincipal;
import com.insp17.ytms.security.JwtTokenUtil;
import com.insp17.ytms.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired
    private UserService userService;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker for these destinations
        config.enableSimpleBroker(
                "/topic",    // For broadcasting to multiple subscribers
                "/queue",    // For user-specific messages
                "/user"      // For user-specific destinations
        );

        // Set application destination prefix for messages handled by controllers
        config.setApplicationDestinationPrefixes("/app");

        // Set user destination prefix
        config.setUserDestinationPrefix("/user");

        log.info("WebSocket message broker configured with topics: /topic, /queue, /user and app prefix: /app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins("http://localhost:3000", "http://127.0.0.1:3000", "http://34.173.178.188:3000")
                .withSockJS()
                .setSessionCookieNeeded(false)
                .setHeartbeatTime(25000)
                .setDisconnectDelay(5000)
                .setStreamBytesLimit(128 * 1024)
                .setHttpMessageCacheSize(1000);

        // Also register without SockJS for native WebSocket support
        registry.addEndpoint("/ws")
                .setAllowedOrigins("http://localhost:3000", "http://127.0.0.1:3000", "http://34.173.178.188:3000");

        log.info("WebSocket STOMP endpoint registered at /ws with SockJS support");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null) {
                    log.debug("WebSocket message: {} from session: {}",
                            accessor.getCommand(),
                            accessor.getSessionId());

                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                        // Extract JWT token from headers
                        String authToken = accessor.getFirstNativeHeader("Authorization");
                        log.info("WebSocket connection attempt with token: {}", authToken != null ? "present" : "missing");

                        if (authToken != null && authToken.startsWith("Bearer ") && !authToken.equals("Bearer undefined")) {
                            try {
                                String token = authToken.substring(7);
                                String username = jwtTokenUtil.getUsernameFromToken(token);

                                if (username != null) {
                                    UserPrincipal userPrincipal = userService.getUserPrincipal(username);

                                    if (jwtTokenUtil.validateToken(token, userPrincipal)) {
                                        Authentication auth = new UsernamePasswordAuthenticationToken(
                                                userPrincipal,
                                                null,
                                                userPrincipal.getAuthorities()
                                        );

                                        // Set both SecurityContext and message user
                                        SecurityContextHolder.getContext().setAuthentication(auth);
                                        accessor.setUser(auth);

                                        log.info("WebSocket authenticated successfully for user: {} with authorities: {}",
                                                username, userPrincipal.getAuthorities());
                                    } else {
                                        log.warn("Invalid JWT token for WebSocket connection from session: {}",
                                                accessor.getSessionId());
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
                    } else if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
                        Principal user = accessor.getUser();
                        if (user != null) {
                            log.info("WebSocket user disconnected: {} from session: {}",
                                    user.getName(), accessor.getSessionId());
                        }
                    }
                }

                return message;
            }
        });
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && accessor.getCommand() != null) {
                    log.debug("Outbound WebSocket message: {} to session: {}",
                            accessor.getCommand(),
                            accessor.getSessionId());
                }

                return message;
            }
        });
    }
}