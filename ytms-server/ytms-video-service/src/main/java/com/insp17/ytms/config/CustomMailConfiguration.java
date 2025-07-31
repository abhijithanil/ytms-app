package com.insp17.ytms.config;

import com.insp17.ytms.config.SecretManagerEmailConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
@Slf4j
public class CustomMailConfiguration {

    @Autowired
    private SecretManagerEmailConfigService emailConfigService;

    @Bean
    @DependsOn("secretManagerEmailConfigService")
    public JavaMailSender javaMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();

        EmailConfigurationProperties emailConfig = emailConfigService.getEmailConfig();

        mailSender.setHost(emailConfig.getHost());
        mailSender.setPort(emailConfig.getPort());
        mailSender.setUsername(emailConfig.getUsername());
        mailSender.setPassword(emailConfig.getPassword());

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", emailConfig.getSmtp().getAuth().isEnabled());
        props.put("mail.smtp.starttls.enable", emailConfig.getSmtp().getStarttls().isEnabled());
        props.put("mail.smtp.starttls.required", true);
        props.put("mail.smtp.ssl.trust", emailConfig.getHost());
        props.put("mail.debug", false); // Set to true for debugging

        log.info("JavaMailSender configured with host: {} and port: {}",
                emailConfig.getHost(), emailConfig.getPort());

        return mailSender;
    }
}