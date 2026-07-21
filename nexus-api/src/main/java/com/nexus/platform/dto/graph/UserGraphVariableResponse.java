package com.nexus.platform.dto.graph;

public record UserGraphVariableResponse(
        Long variableId,
        String variableCode,
        String displayName,
        String unit,
        Integer displayOrder
) {
}
