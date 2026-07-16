package com.nexus.importer.variable;

import java.util.Map;

import com.nexus.domain.entity.MeasurementVariable;

public record MeasurementVariableResolutionResult(
		Map<Integer, MeasurementVariable> variablesByColumnIndex,
		int createdCount,
		int reusedCount,
		int updatedCount,
		int unitConflictCount) {
}
