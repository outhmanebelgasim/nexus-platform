package com.nexus.platform.dto.graph;

import com.nexus.domain.enums.GraphAxis;
import com.nexus.domain.enums.GraphSeriesType;

public record UserGraphVariableResponse(
        Long variableId,
        String variableCode,
        String displayName,
        String unit,
        GraphAxis axis,
        GraphSeriesType chartType,
        Integer displayOrder,
        String customLabel
) {
}
