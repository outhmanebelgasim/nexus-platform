package com.nexus.importer.parser;

import java.nio.file.Path;
import java.util.OptionalInt;

public record DatParseIssue(
		DatParseIssueSeverity severity,
		Path file,
		long physicalLineNumber,
		OptionalInt columnIndex,
		String message,
		String rawValue) {

	public static DatParseIssue error(
			Path file,
			long physicalLineNumber,
			OptionalInt columnIndex,
			String message,
			String rawValue) {
		return new DatParseIssue(DatParseIssueSeverity.ERROR, file, physicalLineNumber, columnIndex, message, rawValue);
	}

	public static DatParseIssue warning(
			Path file,
			long physicalLineNumber,
			OptionalInt columnIndex,
			String message,
			String rawValue) {
		return new DatParseIssue(DatParseIssueSeverity.WARNING, file, physicalLineNumber, columnIndex, message, rawValue);
	}
}
