package com.insp17.ytms.config;

import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.util.StringUtils;

@Configuration
public class RedisConfig {

    @Value("${spring.redis.host}")
    private String redisHost;

    @Value("${spring.redis.port}")
    private int redisPort;

    @Value("${spring.redis.password}")
    private String redisPassword;

    /**
     * This bean is used by Spring Data Redis components like RedisTemplate.
     * It's good to keep it for general Redis operations.
     *
     * @return A configured LettuceConnectionFactory.
     */
    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        validateRedisConfig();

        RedisStandaloneConfiguration redisConfig = new RedisStandaloneConfiguration();
        redisConfig.setHostName(redisHost);
        redisConfig.setPort(redisPort);
        redisConfig.setPassword(redisPassword);

        return new LettuceConnectionFactory(redisConfig);
    }

    /**
     * RedisTemplate bean for YouTube upload progress tracking
     *
     * @param connectionFactory The Lettuce connection factory
     * @return A configured RedisTemplate
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(LettuceConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    /**
     * This new bean provides the raw Lettuce RedisClient.
     * It is specifically required by Bucket4j's LettuceBasedProxyManager in your RatelimiterConfig.
     * The destroyMethod ensures the client's resources are released when the application shuts down.
     *
     * @return A configured RedisClient instance.
     */
    @Bean(destroyMethod = "shutdown")
    public RedisClient redisClient() {
        validateRedisConfig();

        RedisURI redisURI = RedisURI.builder()
                .withHost(redisHost)
                .withPort(redisPort)
                .withPassword(redisPassword.toCharArray())
                .build();

        return RedisClient.create(redisURI);
    }

    private void validateRedisConfig() {
        if (!StringUtils.hasText(redisHost)) {
            throw new IllegalArgumentException("Redis Host (spring.redis.host) is required and cannot be empty.");
        }
        if (redisPort <= 0 || redisPort > 65535) {
            throw new IllegalArgumentException("Redis Port (spring.redis.port) must be between 1 and 65535.");
        }
        if (!StringUtils.hasText(redisPassword)) {
            throw new IllegalArgumentException("Redis Password (spring.redis.password) cannot be empty.");
        }
    }
}