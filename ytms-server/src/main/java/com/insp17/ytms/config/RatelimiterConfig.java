package com.insp17.ytms.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.function.Supplier;

@Configuration
public class RatelimiterConfig {
    @Bean
    public ProxyManager<String>
    lettuceBasedProxyManager(RedisClient redisClient) { //(2)
        StatefulRedisConnection<String, byte[]> redisConnection = redisClient.
                connect(RedisCodec.of(StringCodec.UTF8, ByteArrayCodec.INSTANCE));
        return LettuceBasedProxyManager.builderFor(redisConnection)
                .build();
    }

    @Bean
    public Supplier<BucketConfiguration> bucketConfiguration() { //(3)
        return () -> BucketConfiguration.builder()
                .addLimit(Bandwidth.simple(10L, Duration.ofMinutes(1L)))
                .build();
    }
}