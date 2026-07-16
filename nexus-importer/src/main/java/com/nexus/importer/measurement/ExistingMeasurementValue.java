package com.nexus.importer.measurement;

import java.time.Instant;

record ExistingMeasurementValue(Long variableId, Instant measuredAt, Double numericValue) {
}
