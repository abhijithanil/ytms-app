package com.insp17.ytms.components;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.function.Supplier;

@Aspect
@Component
@Slf4j
public class RateLimiterAspect {

    private final ProxyManager<String> proxyManager;
    private final Supplier<BucketConfiguration> bucketConfigurationSupplier;

    public RateLimiterAspect(ProxyManager<String> proxyManager, Supplier<BucketConfiguration> bucketConfigurationSupplier) {
        this.proxyManager = proxyManager;
        this.bucketConfigurationSupplier = bucketConfigurationSupplier;
    }

    @Around("@annotation(com.insp17.ytms.components.RateLimited)")
    public Object rateLimit(ProceedingJoinPoint joinPoint) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        assert attributes != null;
        HttpServletRequest request = attributes.getRequest();
        HttpServletResponse response = attributes.getResponse();

        String clientKey = request.getRemoteAddr();

        log.warn("Too many request to {}:{} from {}", request.getMethod(), request.getRequestURI(), clientKey);

        Bucket bucket = proxyManager.builder().build(clientKey, bucketConfigurationSupplier);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            return joinPoint.proceed();
        } else {
            if (response != null) {
                response.sendError(HttpStatus.TOO_MANY_REQUESTS.value(), "You have exhausted your API request quota.");
            }
            // Returning null or throwing an exception depends on your desired controller behavior
            return null;
        }
    }
}
