package com.insp17.ytms.service;

import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class MfaService {

    private final TimeBasedOneTimePasswordGenerator totp;

    @Autowired
    private GoogleAuthenticator googleAuthenticator;

    @Value("${app.mfa.issuer:YTMS}")
    private String issuer;

    @Value("${app.mfa.icon-url:}")
    private String iconUrl;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;


    public MfaService() {
        totp = new TimeBasedOneTimePasswordGenerator();
    }


    public String generateNewSecret() {
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        return key.getKey();
    }

    /**
     * Generate QR code image as base64 data URI with app icon support
     */
    public String generateQrCodeImageAsDataUri(String username, String secret) throws Exception {
        String otpAuthUrl = buildOtpAuthUrl(username, secret);

        // Log for debugging
        System.out.println("Generated OTP Auth URL: " + otpAuthUrl);

        // Generate QR code
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(otpAuthUrl, BarcodeFormat.QR_CODE, 200, 200);

        ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);

        byte[] qrCodeBytes = pngOutputStream.toByteArray();
        String base64Image = Base64.getEncoder().encodeToString(qrCodeBytes);
        return "data:image/png;base64," + base64Image;
    }

    /**
     * Build OTP Auth URL with proper issuer and icon
     */
    private String buildOtpAuthUrl(String username, String secret) {
        try {
            // URL encode components
            String encodedIssuer = URLEncoder.encode(issuer, StandardCharsets.UTF_8);
            String encodedUsername = URLEncoder.encode(username, StandardCharsets.UTF_8);
            String encodedSecret = URLEncoder.encode(secret, StandardCharsets.UTF_8);

            // Build the OTP auth URL
            StringBuilder urlBuilder = new StringBuilder();
            urlBuilder.append("otpauth://totp/")
                    .append(encodedIssuer)
                    .append(":")
                    .append(encodedUsername)
                    .append("?secret=")
                    .append(encodedSecret)
                    .append("&issuer=")
                    .append(encodedIssuer)
                    .append("&algorithm=SHA1")
                    .append("&digits=6")
                    .append("&period=30");

            // Add icon URL - use local resource
            String iconUrl = baseUrl + "/icon.ico";
            String encodedIconUrl = URLEncoder.encode(iconUrl, StandardCharsets.UTF_8);
            urlBuilder.append("&image=").append(encodedIconUrl);

            return urlBuilder.toString();

        } catch (Exception e) {
            // Fallback to basic URL if encoding fails
            return String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
                    issuer, username, secret, issuer);
        }
    }

    public boolean verifyTotp(String secret, int code) {
        try {
            if (secret == null || secret.trim().isEmpty()) {
                System.err.println("Secret is null or empty");
                return false;
            }

            if (code < 0 || code > 999999) {
                System.err.println("Invalid code range: " + code);
                return false;
            }

            boolean isValid = googleAuthenticator.authorize(secret, code);

            if (isValid) {
                System.out.println("TOTP verification successful");
            } else {
                System.out.println("TOTP verification failed");
            }

            return isValid;
        } catch (Exception e) {
            System.err.println("Error verifying TOTP code: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
}