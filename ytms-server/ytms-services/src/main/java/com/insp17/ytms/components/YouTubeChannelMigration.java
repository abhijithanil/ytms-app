package com.insp17.ytms.components;

import com.insp17.ytms.repository.YouTubeChannelRepository;
import com.insp17.ytms.service.YouTubeAccountService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("migration")
@Slf4j
public class YouTubeChannelMigration implements CommandLineRunner {

    @Autowired
    private YouTubeChannelRepository youTubeChannelRepository;

    @Autowired
    private YouTubeAccountService youTubeAccountService;

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting YouTube channel migration...");

        // Find all channels without owner email
        youTubeChannelRepository.findAll().stream()
                .filter(channel -> channel.getYoutubeChannelOwnerEmail() == null)
                .forEach(channel -> {
                    log.info("Migrating channel: {} ({})", channel.getChannelName(), channel.getChannelId());

                    // You'll need to manually map these or prompt for input
                    // For now, this is a template
                    log.warn("Channel {} needs manual email assignment", channel.getChannelName());

                    // Example: Set a default or prompt for input
                    // channel.setYoutubeChannelOwnerEmail("default@youtube.com");
                    // youTubeChannelRepository.save(channel);
                });

        log.info("Migration completed. Please manually assign YouTube account emails to channels without them.");
    }
}