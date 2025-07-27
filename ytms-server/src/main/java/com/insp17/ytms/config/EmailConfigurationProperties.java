package com.insp17.ytms.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "mail")
public class EmailConfigurationProperties {
    private String host;
    private int port;
    private String username;
    private String password;
    private Smtp smtp = new Smtp();

    @Data
    public static class Smtp {
        private Auth auth = new Auth();
        private Starttls starttls = new Starttls();

        @Data
        public static class Auth {
            private boolean enabled = true;
        }

        @Data
        public static class Starttls {
            private boolean enabled = true;
        }
    }
}
