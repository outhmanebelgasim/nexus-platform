package com.nexus.platform.dto.graph;

import jakarta.validation.constraints.NotNull;

public record UserGraphVariableRequest(
        @NotNull Long variableId,
        String variableCode,
        @NotNull Integer displayOrder
) {
}
