package com.nexus.importer.parser;

public record ParsedMeasurementValue(
		int columnIndex,
		String rawValue,
		Double numericValue,
		ValueStatus status) {
}
