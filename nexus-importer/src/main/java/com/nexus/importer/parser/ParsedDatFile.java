package com.nexus.importer.parser;

import java.util.List;

import com.nexus.importer.file.DatFileDescriptor;

public record ParsedDatFile(
		DatFileDescriptor descriptor,
		List<ParsedVariableHeader> variables,
		List<ParsedDataRow> rows,
		List<DatParseIssue> issues) {

	public long skippedRowCount() {
		return issues.stream()
				.filter(issue -> issue.severity() == DatParseIssueSeverity.ERROR)
				.filter(issue -> issue.message().startsWith("Skipping row"))
				.count();
	}

	public long missingValueCount() {
		return rows.stream()
				.flatMap(row -> row.values().values().stream())
				.filter(value -> value.status() == ValueStatus.MISSING)
				.count();
	}

	public long invalidValueCount() {
		return rows.stream()
				.flatMap(row -> row.values().values().stream())
				.filter(value -> value.status() == ValueStatus.INVALID)
				.count();
	}
}
