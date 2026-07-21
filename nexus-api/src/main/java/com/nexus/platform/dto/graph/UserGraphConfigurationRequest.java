package com.nexus.platform.dto.graph;

import com.nexus.domain.enums.StationCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record UserGraphConfigurationRequest(
        @NotBlank @Size(max = 150) String title,
        String description,
        @NotNull Long stationId,
        @NotNull StationCategory stationCategory,
        @NotNull BigDecimal yAxisMin,
        @NotNull BigDecimal yAxisMax,
        @NotNull Integer displayOrder,
        boolean active,
        @NotEmpty List<@Valid UserGraphVariableRequest> variables
) {
}
