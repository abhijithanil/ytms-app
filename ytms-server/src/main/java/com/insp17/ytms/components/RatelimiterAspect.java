package com.insp17.ytms.components;

import com.insp17.ytms.config.RatelimiterConfig;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import io.github.bucket4j.Bucket;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Aspect
public class RatelimiterAspect {
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    private final RatelimiterConfig ratelimiterConfig;

    public RatelimiterAspect(RatelimiterConfig ratelimiterConfig) {
        this.ratelimiterConfig = ratelimiterConfig;
    }

    @Around("@annotation(com.example.ratelimiting.aspect.Ratelimited)")
    public Object ratelimit(ProceedingJoinPoint joinPoint) throws Throwable {
        HttpServletRequest request = ((ServletRequestAttributes)
                RequestContextHolder.getRequestAttributes()).getRequest();
        String clientKey = request.getHeader("clientId");

        Bucket bucket = getOrCreateBucket(clientKey);

        if (bucket.tryConsume(1)) {
            return joinPoint.proceed();
        } else {
            HttpServletResponse response = ((ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes()).getResponse();
            if (response != null) {
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            }
            throw new RuntimeException("Rate limit exceeded");
        }
    }

    private Bucket getOrCreateBucket(String clientKey) {
        return buckets.computeIfAbsent(clientKey, key -> {
            // Configure bandwidth based on your requirements
            // Example: 10 requests per minute
            Bandwidth limit = Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1)));

            // Alternative configurations:
            // For 100 requests per hour:
            // Bandwidth limit = Bandwidth.classic(100, Refill.intervally(100, Duration.ofHours(1)));

            // For 5 requests per second:
            // Bandwidth limit = Bandwidth.classic(5, Refill.intervally(5, Duration.ofSeconds(1)));

            return Bucket.builder()
                    .addLimit(limit)
                    .build();
        });
    }

    // Optional: Method to clean up old buckets (recommended for production)
    @Scheduled(fixedRate = 3600000) // Run every hour
    public void cleanupOldBuckets() {
        // Remove buckets that haven't been used recently
        // This is a simple implementation - you might want more sophisticated cleanup
        buckets.entrySet().removeIf(entry -> {
            Bucket bucket = entry.getValue();
            // Remove if bucket is full (indicating no recent usage)
            return bucket.getAvailableTokens() >= 10; // Adjust based on your capacity
        });
    }
}