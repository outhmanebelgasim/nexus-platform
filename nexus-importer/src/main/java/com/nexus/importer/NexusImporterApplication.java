package com.nexus.importer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@ConfigurationPropertiesScan
@EntityScan(basePackages = "com.nexus.domain.entity")
@EnableJpaRepositories(basePackages = "com.nexus.importer.repository")
@SpringBootApplication
public class NexusImporterApplication {

	public static void main(String[] args) {
		SpringApplication.run(NexusImporterApplication.class, args);
	}

}
