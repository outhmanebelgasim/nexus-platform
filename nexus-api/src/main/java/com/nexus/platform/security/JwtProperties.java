package com.nexus.platform.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nexus.security.jwt")
public record JwtProperties(
        String secret,
        String issuer,
        long expirationMinutes
) {
}
