package com.insp17.ytms.security;


import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

// JWT Authentication Entry Point
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        String body = """
            {
                "error": "Unauthorized",
                "message": "Access denied. Please provide valid authentication credentials.",
                "path": "%s",
                "timestamp": "%s"
            }
            """.formatted(request.getRequestURI(), Instant.now().toString());

        response.getWriter().write(body);
    }
}
