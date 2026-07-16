package com.nexus.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;

@SpringBootApplication(scanBasePackages = "com.nexus")
@EntityScan(basePackages = {"com.nexus.domain.entity", "com.nexus.platform.model"})
public class NexusPlatformApplication {

	public static void main(String[] args) {
		SpringApplication.run(NexusPlatformApplication.class, args);
	}

}
