package com.nexus.platform.dto.measurementvariable;

import com.nexus.domain.enums.MeasurementType;
import jakarta.validation.constraints.Size;

public record MeasurementVariableRequest(
        @Size(max = 150)
        String displayName,

        @Size(max = 30)
        String unit,

        String description,

        Boolean active,

        MeasurementType measurementType
) {
}
