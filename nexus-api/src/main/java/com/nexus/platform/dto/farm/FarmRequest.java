package com.nexus.platform.dto.farm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FarmRequest(
        @NotBlank
        @Size(max = 150)
        String name,

        @Size(max = 255)
        String location,

        String description,

        String googleMapsUrl
) {
}
