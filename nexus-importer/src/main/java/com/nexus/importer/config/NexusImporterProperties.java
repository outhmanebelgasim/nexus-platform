package com.nexus.importer.config;

import java.nio.file.Path;
import java.time.Duration;

import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "nexus.importer")
public record NexusImporterProperties(
		@NotNull Path inputDirectory,
		boolean enabled,
		@NotNull Duration scanDelay,
		@NotNull Duration initialDelay,
		@NotNull Duration minimumFileAge) {
}
