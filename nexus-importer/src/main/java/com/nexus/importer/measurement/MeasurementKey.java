package com.nexus.importer.measurement;

import java.time.Instant;

record MeasurementKey(Long variableId, Instant measuredAt) {
}
