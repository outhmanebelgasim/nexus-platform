package com.nexus.platform.dto.graph;

import com.nexus.platform.dto.measurement.MeasurementResponse;
import com.nexus.platform.dto.measurementvariable.MeasurementVariableResponse;

import java.util.List;

public record RestrictedGraphMeasurementResponse(
        UserGraphConfigurationResponse graph,
        List<MeasurementVariableResponse> variables,
        List<MeasurementResponse> measurements,
        boolean aggregated,
        String aggregationNote
) {
}
