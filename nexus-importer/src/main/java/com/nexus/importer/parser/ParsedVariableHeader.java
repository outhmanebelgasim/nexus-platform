package com.nexus.importer.parser;

public record ParsedVariableHeader(
		int columnIndex,
		String code,
		String unit,
		String aggregation,
		boolean timestampColumn) {
}
