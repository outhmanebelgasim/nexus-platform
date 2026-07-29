package com.nexus.platform.dto.graph;

import com.nexus.domain.enums.GraphAxis;
import com.nexus.domain.enums.GraphSeriesType;
import jakarta.validation.constraints.NotNull;

public record UserGraphVariableRequest(
        @NotNull Long variableId,
        String variableCode,
        @NotNull GraphAxis axis,
        @NotNull GraphSeriesType chartType,
        @NotNull Integer displayOrder,
        String customLabel
) {
}
