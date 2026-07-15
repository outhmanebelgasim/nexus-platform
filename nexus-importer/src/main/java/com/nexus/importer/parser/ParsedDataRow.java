package com.nexus.importer.parser;

import java.time.LocalDateTime;
import java.util.Map;

public record ParsedDataRow(
		long physicalLineNumber,
		LocalDateTime timestamp,
		Map<Integer, ParsedMeasurementValue> values) {
}
