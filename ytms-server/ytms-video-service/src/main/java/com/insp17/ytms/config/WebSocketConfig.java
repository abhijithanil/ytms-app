package com.insp17.ytms.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple message broker for topics and queues
        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{25000, 25000}) // Heartbeat every 25 seconds
                .setTaskScheduler(null); // Use default task scheduler

        // Set application destination prefix
        config.setApplicationDestinationPrefixes("/app");

        // Set user destination prefix for personal messages
        config.setUserDestinationPrefix("/user");

        log.info("Message broker configured with /topic, /queue destinations and /app prefix");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register STOMP endpoint with SockJS fallback
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Allow all origins in development
                .withSockJS()
                .setHeartbeatTime(25000) // Heartbeat every 25 seconds
                .setDisconnectDelay(5000) // Disconnect delay 5 seconds
                .setSessionCookieNeeded(false); // Don't require session cookie

        log.info("STOMP endpoint registered at /ws with SockJS fallback");
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        // Configure WebSocket transport settings
        registration.setMessageSizeLimit(64 * 1024) // 64KB message size limit
                .setSendBufferSizeLimit(512 * 1024) // 512KB send buffer
                .setSendTimeLimit(20000) // 20 second send timeout
                .setTimeToFirstMessage(30000); // 30 second time to first message

        log.info("WebSocket transport configured with size and time limits");
    }
}