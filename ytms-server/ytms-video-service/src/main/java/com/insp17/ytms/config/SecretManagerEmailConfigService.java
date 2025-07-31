package com.insp17.ytms.config;

import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import com.google.cloud.secretmanager.v1.SecretVersionName;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.insp17.ytms.config.EmailConfigurationProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;

@Service
@Slf4j
public class SecretManagerEmailConfigService {

    @Value("${gcp.project-id}")
    private String projectId;

    @Value("${gcp.email-config-secret:email_config}")
    private String emailConfigSecretKey;

    @Autowired
    private SecretManagerServiceClient secretManagerServiceClient;

    @Autowired
    private EmailConfigurationProperties emailConfigProperties;

    @PostConstruct
    public void loadEmailConfiguration() {
        try {
            log.info("Loading email configuration from Secret Manager...");
            JsonObject emailConfig = fetchEmailConfigFromSecretManager();

            // Set the properties
            emailConfigProperties.setHost(emailConfig.get("host").getAsString());
            emailConfigProperties.setPort(emailConfig.get("port").getAsInt());
            emailConfigProperties.setUsername(emailConfig.get("username").getAsString());
            emailConfigProperties.setPassword(emailConfig.get("password").getAsString());

            log.info("Email configuration loaded successfully from Secret Manager");
            log.debug("Email host: {}, port: {}, username: {}",
                    emailConfigProperties.getHost(),
                    emailConfigProperties.getPort(),
                    emailConfigProperties.getUsername());

        } catch (Exception e) {
            log.error("Failed to load email configuration from Secret Manager", e);
            throw new RuntimeException("Unable to initialize email configuration", e);
        }
    }

    private JsonObject fetchEmailConfigFromSecretManager() {
        try {
            SecretVersionName secretVersionName = SecretVersionName.of(projectId, emailConfigSecretKey, "latest");
            String payload = secretManagerServiceClient.accessSecretVersion(secretVersionName)
                    .getPayload().getData().toStringUtf8();

            return JsonParser.parseString(payload).getAsJsonObject();
        } catch (Exception e) {
            log.error("Failed to fetch email configuration from Secret Manager", e);
            throw new RuntimeException("Unable to retrieve email configuration", e);
        }
    }

    public EmailConfigurationProperties getEmailConfig() {
        return emailConfigProperties;
    }
}