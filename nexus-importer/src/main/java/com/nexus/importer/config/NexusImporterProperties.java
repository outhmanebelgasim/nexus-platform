package com.nexus.importer.config;

import java.nio.file.Path;
import java.time.Duration;
import java.time.ZoneId;

import jakarta.validation.constraints.Min;
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
		@NotNull Duration minimumFileAge,
		@NotNull ZoneId sourceTimeZone,
		@Min(1) int measurementBatchSize) {
}
