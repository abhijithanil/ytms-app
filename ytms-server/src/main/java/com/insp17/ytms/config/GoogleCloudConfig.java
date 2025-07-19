package com.insp17.ytms.config;

import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class GoogleCloudConfig {

    /**
     * Creates a singleton bean for the SecretManagerServiceClient.
     * This bean will be managed by Spring, and its lifecycle (including closing the client)
     * will be handled automatically.
     *
     * @return An instance of SecretManagerServiceClient.
     * @throws IOException If the client fails to initialize.
     */
    @Bean
    public SecretManagerServiceClient secretManagerServiceClient() throws IOException {
        return SecretManagerServiceClient.create();
    }
}