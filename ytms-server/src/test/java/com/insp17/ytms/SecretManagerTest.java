package com.insp17.ytms;

import com.google.cloud.secretmanager.v1.*;
import org.junit.After;
import org.junit.Test;

import java.io.IOException;

public class SecretManagerTest {

    private final String projectId = "inspire26";
    private final String secretId = "ABHI";

    @Test
    public void testCreateSecret() throws IOException {
        try (SecretManagerServiceClient secretManagerServiceClient = SecretManagerServiceClient.create()) {
            secretManagerServiceClient.createSecret(
                    ProjectName.of(projectId),
                    secretId,
                    Secret.newBuilder()
                            .setReplication(
                                    Replication.newBuilder()
                                            .setAutomatic(Replication.Automatic.newBuilder().build())
                                            .build()
                            )
                            .build());
            System.out.println("Secret created successfully: " + secretId);
        }
    }

    @After
    public void cleanup() throws IOException {
        try (SecretManagerServiceClient secretManagerServiceClient = SecretManagerServiceClient.create()) {
            System.out.println("Cleaning up secret: " + secretId);
            secretManagerServiceClient.deleteSecret(SecretName.of(projectId, secretId));
            System.out.println("Secret deleted successfully.");
        } catch (Exception e) {
            System.err.println("Could not delete secret (it may not exist): " + e.getMessage());
        }
    }

    @Test
    public void testSecretManager() throws IOException {

        SecretManagerServiceClient secretManagerServiceClient = SecretManagerServiceClient.create();
        SecretVersionName secretVersionName = SecretVersionName.of("inspire26", "client_data", "latest");

        // Access the secret version
        AccessSecretVersionResponse response = secretManagerServiceClient.accessSecretVersion(secretVersionName);

        // Get the secret payload
        String payload = response.getPayload().getData().toStringUtf8();
        System.out.println("Secret Value: " + payload);
    }


}
