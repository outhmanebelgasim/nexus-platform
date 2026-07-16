package com.nexus.importer.repository;

import java.time.Instant;

public interface StationMeasurementStats {

	Instant getEarliestMeasuredAt();

	Instant getLatestMeasuredAt();

	long getMeasurementCount();
}
