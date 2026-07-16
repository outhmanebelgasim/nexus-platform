package com.nexus.importer.scheduling;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.OptionalInt;
import java.util.Set;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.parser.DatParseIssue;
import com.nexus.importer.parser.ParsedVariableHeader;

@Component
public class DatFileHeaderInspector {

	private static final CSVFormat CSV_FORMAT = CSVFormat.RFC4180.builder()
			.setTrim(false)
			.setIgnoreEmptyLines(false)
			.get();

	public DatFileHeaderInspection inspect(DatFileDescriptor descriptor) {
		List<DatParseIssue> issues = new ArrayList<>();
		List<CSVRecord> records;
		try {
			records = readHeaderRecords(descriptor);
		}
		catch (IOException | IllegalArgumentException ex) {
			issues.add(DatParseIssue.error(
					descriptor.path(),
					1,
					OptionalInt.empty(),
					"Unable to inspect CSV header: " + ex.getMessage(),
					null));
			return new DatFileHeaderInspection(List.of(), List.copyOf(issues));
		}

		if (records.size() < 4) {
			issues.add(DatParseIssue.error(
					descriptor.path(),
					records.isEmpty() ? 1 : Math.toIntExact(records.get(records.size() - 1).getRecordNumber()),
					OptionalInt.empty(),
					"File must contain logger metadata plus variable, unit, and aggregation header rows",
					null));
			return new DatFileHeaderInspection(List.of(), List.copyOf(issues));
		}

		CSVRecord codeRecord = records.get(1);
		CSVRecord unitRecord = records.get(2);
		CSVRecord aggregationRecord = records.get(3);
		if (!validateHeaders(descriptor, codeRecord, unitRecord, aggregationRecord, issues)) {
			return new DatFileHeaderInspection(List.of(), List.copyOf(issues));
		}

		List<ParsedVariableHeader> variables = new ArrayList<>();
		for (int columnIndex = 0; columnIndex < codeRecord.size(); columnIndex++) {
			variables.add(new ParsedVariableHeader(
					columnIndex,
					trim(value(codeRecord, columnIndex)),
					trim(value(unitRecord, columnIndex)),
					trim(value(aggregationRecord, columnIndex)),
					columnIndex == 0));
		}
		return new DatFileHeaderInspection(List.copyOf(variables), List.copyOf(issues));
	}

	private List<CSVRecord> readHeaderRecords(DatFileDescriptor descriptor) throws IOException {
		try (Reader reader = java.nio.file.Files.newBufferedReader(descriptor.path(), StandardCharsets.UTF_8);
				CSVParser parser = CSV_FORMAT.parse(reader)) {
			List<CSVRecord> records = new ArrayList<>(4);
			for (CSVRecord record : parser) {
				records.add(record);
				if (records.size() == 4) {
					break;
				}
			}
			return records;
		}
	}

	private boolean validateHeaders(
			DatFileDescriptor descriptor,
			CSVRecord codeRecord,
			CSVRecord unitRecord,
			CSVRecord aggregationRecord,
			List<DatParseIssue> issues) {
		if (codeRecord.size() != unitRecord.size() || codeRecord.size() != aggregationRecord.size()) {
			issues.add(DatParseIssue.error(
					descriptor.path(),
					Math.toIntExact(codeRecord.getRecordNumber()),
					OptionalInt.empty(),
					"Header rows must have the same column count",
					"%d/%d/%d".formatted(codeRecord.size(), unitRecord.size(), aggregationRecord.size())));
			return false;
		}

		if (codeRecord.size() == 0 || !"TIMESTAMP".equalsIgnoreCase(trim(value(codeRecord, 0)))) {
			issues.add(DatParseIssue.error(
					descriptor.path(),
					Math.toIntExact(codeRecord.getRecordNumber()),
					OptionalInt.of(0),
					"First header column must be TIMESTAMP",
					codeRecord.size() == 0 ? null : value(codeRecord, 0)));
			return false;
		}

		Set<String> seenCodes = new HashSet<>();
		for (int columnIndex = 1; columnIndex < codeRecord.size(); columnIndex++) {
			String code = trim(value(codeRecord, columnIndex));
			if (code.isBlank()) {
				issues.add(DatParseIssue.error(
						descriptor.path(),
						Math.toIntExact(codeRecord.getRecordNumber()),
						OptionalInt.of(columnIndex),
						"Variable code must not be blank",
						value(codeRecord, columnIndex)));
				return false;
			}
			if (!seenCodes.add(code.toLowerCase(Locale.ROOT))) {
				issues.add(DatParseIssue.error(
						descriptor.path(),
						Math.toIntExact(codeRecord.getRecordNumber()),
						OptionalInt.of(columnIndex),
						"Duplicate variable code in file",
						code));
				return false;
			}
		}
		return true;
	}

	private static String value(CSVRecord record, int index) {
		return index < record.size() ? record.get(index) : "";
	}

	private static String trim(String value) {
		return value == null ? "" : value.trim();
	}
}
