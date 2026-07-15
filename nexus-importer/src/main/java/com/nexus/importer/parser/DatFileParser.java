package com.nexus.importer.parser;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.OptionalInt;
import java.util.Set;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileType;

@Component
public class DatFileParser {

	private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
	private static final Set<String> INVALID_NUMERIC_TOKENS = Set.of(
			"nan",
			"null",
			"inf",
			"+inf",
			"-inf",
			"infinity",
			"+infinity",
			"-infinity");
	private static final CSVFormat CSV_FORMAT = CSVFormat.RFC4180.builder()
			.setTrim(false)
			.setIgnoreEmptyLines(false)
			.get();

	public ParsedDatFile parse(DatFileDescriptor descriptor) {
		List<DatParseIssue> issues = new ArrayList<>();
		List<CSVRecord> records;
		try {
			records = readRecords(descriptor.path());
		}
		catch (IOException | IllegalArgumentException ex) {
			issues.add(DatParseIssue.error(
					descriptor.path(),
					1,
					OptionalInt.empty(),
					"Unable to parse CSV file: " + ex.getMessage(),
					null));
			return result(descriptor, List.of(), List.of(), issues);
		}

		if (records.size() < 4) {
			issues.add(DatParseIssue.error(
					descriptor.path(),
					records.isEmpty() ? 1 : physicalLineNumber(records.get(records.size() - 1)),
					OptionalInt.empty(),
					"File must contain logger metadata plus variable, unit, and aggregation header rows",
					null));
			return result(descriptor, List.of(), List.of(), issues);
		}

		CSVRecord codeRecord = records.get(1);
		CSVRecord unitRecord = records.get(2);
		CSVRecord aggregationRecord = records.get(3);
		int headerColumnCount = codeRecord.size();

		if (!validateHeaders(descriptor, codeRecord, unitRecord, aggregationRecord, issues)) {
			return result(descriptor, List.of(), List.of(), issues);
		}

		List<ParsedVariableHeader> variables = buildHeaders(codeRecord, unitRecord, aggregationRecord);
		List<ParsedDataRow> rows = parseDataRows(descriptor, records, headerColumnCount, issues);
		addTypeWarnings(descriptor, rows, issues);
		return result(descriptor, variables, rows, issues);
	}

	private List<CSVRecord> readRecords(Path path) throws IOException {
		try (Reader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8);
				CSVParser parser = CSV_FORMAT.parse(reader)) {
			return parser.stream().toList();
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
					physicalLineNumber(codeRecord),
					OptionalInt.empty(),
					"Header rows must have the same column count",
					"%d/%d/%d".formatted(codeRecord.size(), unitRecord.size(), aggregationRecord.size())));
			return false;
		}

		if (codeRecord.size() == 0 || !"TIMESTAMP".equalsIgnoreCase(trim(value(codeRecord, 0)))) {
			issues.add(DatParseIssue.error(
					descriptor.path(),
					physicalLineNumber(codeRecord),
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
						physicalLineNumber(codeRecord),
						OptionalInt.of(columnIndex),
						"Variable code must not be blank",
						value(codeRecord, columnIndex)));
				return false;
			}
			String normalizedCode = code.toLowerCase(Locale.ROOT);
			if (!seenCodes.add(normalizedCode)) {
				issues.add(DatParseIssue.error(
						descriptor.path(),
						physicalLineNumber(codeRecord),
						OptionalInt.of(columnIndex),
						"Duplicate variable code in file",
						code));
				return false;
			}
		}
		return true;
	}

	private List<ParsedVariableHeader> buildHeaders(
			CSVRecord codeRecord,
			CSVRecord unitRecord,
			CSVRecord aggregationRecord) {
		List<ParsedVariableHeader> variables = new ArrayList<>();
		for (int columnIndex = 0; columnIndex < codeRecord.size(); columnIndex++) {
			variables.add(new ParsedVariableHeader(
					columnIndex,
					trim(value(codeRecord, columnIndex)),
					trim(value(unitRecord, columnIndex)),
					trim(value(aggregationRecord, columnIndex)),
					columnIndex == 0));
		}
		return List.copyOf(variables);
	}

	private List<ParsedDataRow> parseDataRows(
			DatFileDescriptor descriptor,
			List<CSVRecord> records,
			int headerColumnCount,
			List<DatParseIssue> issues) {
		List<ParsedDataRow> rows = new ArrayList<>();
		for (int recordIndex = 4; recordIndex < records.size(); recordIndex++) {
			CSVRecord record = records.get(recordIndex);
			if (isBlankRecord(record)) {
				continue;
			}

			long physicalLineNumber = physicalLineNumber(record);
			if (record.size() != headerColumnCount) {
				issues.add(DatParseIssue.error(
						descriptor.path(),
						physicalLineNumber,
						OptionalInt.empty(),
						"Skipping row because column count does not match header",
						String.valueOf(record.size())));
				continue;
			}

			LocalDateTime timestamp = parseTimestamp(descriptor, record, physicalLineNumber, issues);
			if (timestamp == null) {
				continue;
			}

			Map<Integer, ParsedMeasurementValue> values = new LinkedHashMap<>();
			for (int columnIndex = 1; columnIndex < record.size(); columnIndex++) {
				ParsedMeasurementValue parsedValue = parseMeasurementValue(record, columnIndex);
				values.put(columnIndex, parsedValue);
				if (parsedValue.status() == ValueStatus.INVALID) {
					issues.add(DatParseIssue.error(
							descriptor.path(),
							physicalLineNumber,
							OptionalInt.of(columnIndex),
							"Invalid numeric value",
							parsedValue.rawValue()));
				}
			}
			rows.add(new ParsedDataRow(physicalLineNumber, timestamp, Map.copyOf(values)));
		}
		return List.copyOf(rows);
	}

	private LocalDateTime parseTimestamp(
			DatFileDescriptor descriptor,
			CSVRecord record,
			long physicalLineNumber,
			List<DatParseIssue> issues) {
		String rawTimestamp = trim(value(record, 0));
		try {
			return LocalDateTime.parse(rawTimestamp, TIMESTAMP_FORMAT);
		}
		catch (DateTimeParseException ex) {
			issues.add(DatParseIssue.error(
					descriptor.path(),
					physicalLineNumber,
					OptionalInt.of(0),
					"Skipping row because timestamp is invalid",
					value(record, 0)));
			return null;
		}
	}

	private ParsedMeasurementValue parseMeasurementValue(CSVRecord record, int columnIndex) {
		String rawValue = value(record, columnIndex);
		String trimmedValue = trim(rawValue);
		if (trimmedValue.isEmpty()) {
			return new ParsedMeasurementValue(columnIndex, rawValue, null, ValueStatus.MISSING);
		}
		if (INVALID_NUMERIC_TOKENS.contains(trimmedValue.toLowerCase(Locale.ROOT))) {
			return new ParsedMeasurementValue(columnIndex, rawValue, null, ValueStatus.INVALID);
		}
		try {
			double parsed = Double.parseDouble(trimmedValue);
			if (!Double.isFinite(parsed)) {
				return new ParsedMeasurementValue(columnIndex, rawValue, null, ValueStatus.INVALID);
			}
			return new ParsedMeasurementValue(columnIndex, rawValue, parsed, ValueStatus.VALID);
		}
		catch (NumberFormatException ex) {
			return new ParsedMeasurementValue(columnIndex, rawValue, null, ValueStatus.INVALID);
		}
	}

	private void addTypeWarnings(DatFileDescriptor descriptor, List<ParsedDataRow> rows, List<DatParseIssue> issues) {
		if (descriptor.fileType() == DatFileType.ET0_DAILY) {
			addDuplicateEt0DayWarnings(descriptor, rows, issues);
			return;
		}
		addThirtyMinuteIntervalWarnings(descriptor, rows, issues);
	}

	private void addDuplicateEt0DayWarnings(
			DatFileDescriptor descriptor,
			List<ParsedDataRow> rows,
			List<DatParseIssue> issues) {
		Set<LocalDate> seenDays = new HashSet<>();
		for (ParsedDataRow row : rows) {
			LocalDate day = row.timestamp().toLocalDate();
			if (!seenDays.add(day)) {
				issues.add(DatParseIssue.warning(
						descriptor.path(),
						row.physicalLineNumber(),
						OptionalInt.of(0),
						"Multiple ET0 records exist for the same calendar day",
						day.toString()));
			}
		}
	}

	private void addThirtyMinuteIntervalWarnings(
			DatFileDescriptor descriptor,
			List<ParsedDataRow> rows,
			List<DatParseIssue> issues) {
		for (int rowIndex = 1; rowIndex < rows.size(); rowIndex++) {
			ParsedDataRow previous = rows.get(rowIndex - 1);
			ParsedDataRow current = rows.get(rowIndex);
			long minutes = java.time.Duration.between(previous.timestamp(), current.timestamp()).abs().toMinutes();
			if (minutes < 29 || minutes > 31) {
				issues.add(DatParseIssue.warning(
						descriptor.path(),
						current.physicalLineNumber(),
						OptionalInt.of(0),
						"Timestamp interval is not approximately 30 minutes",
						String.valueOf(minutes)));
			}
		}
	}

	private boolean isBlankRecord(CSVRecord record) {
		for (String field : record) {
			if (!trim(field).isBlank()) {
				return false;
			}
		}
		return true;
	}

	private long physicalLineNumber(CSVRecord record) {
		return record.getRecordNumber();
	}

	private ParsedDatFile result(
			DatFileDescriptor descriptor,
			List<ParsedVariableHeader> variables,
			List<ParsedDataRow> rows,
			List<DatParseIssue> issues) {
		return new ParsedDatFile(descriptor, List.copyOf(variables), List.copyOf(rows), List.copyOf(issues));
	}

	private String value(CSVRecord record, int columnIndex) {
		return record.get(columnIndex);
	}

	private String trim(String value) {
		return value == null ? "" : value.trim();
	}
}
