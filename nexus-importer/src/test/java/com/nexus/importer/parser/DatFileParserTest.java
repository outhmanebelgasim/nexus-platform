package com.nexus.importer.parser;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.OptionalInt;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileType;

class DatFileParserTest {

	private final DatFileParser parser = new DatFileParser();

	@TempDir
	private Path tempDir;

	@Test
	void parsesValidMtoHeaderAndRows() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("MTO_Yazid.dat", """
				"TOA5","CR1000"
				"TIMESTAMP","batt_volt_Avg","AirTC_Avg"
				"TS","Volts","Deg C"
				"","Avg","Avg"
				"2026-02-09 13:30:00",14.33816,20.416
				"2026-02-09 14:00:00",14.1,21.2
				""", DatFileType.THIRTY_MINUTE));

		assertThat(parsedFile.variables()).hasSize(3);
		assertThat(parsedFile.variables().get(0).timestampColumn()).isTrue();
		assertThat(parsedFile.variables().get(1).code()).isEqualTo("batt_volt_Avg");
		assertThat(parsedFile.variables().get(1).unit()).isEqualTo("Volts");
		assertThat(parsedFile.variables().get(1).aggregation()).isEqualTo("Avg");
		assertThat(parsedFile.rows()).hasSize(2);
		assertThat(parsedFile.rows().get(0).timestamp()).isEqualTo(LocalDateTime.of(2026, 2, 9, 13, 30));
		assertThat(parsedFile.rows().get(0).values().get(1).numericValue()).isEqualTo(14.33816);
		assertThat(parsedFile.issues()).isEmpty();
	}

	@Test
	void parsesValidFosStyleFile() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("FOS_Lahna_humidite_sol_All.dat", """
				"TOA5","CR1000"
				"TIMESTAMP","SoilWater_1","SoilTemp_1"
				"TS","m3/m3","Deg C"
				"","Avg","Avg"
				"2026-02-09 13:30:00",0.122,18.4
				""", DatFileType.THIRTY_MINUTE));

		assertThat(parsedFile.variables()).extracting(ParsedVariableHeader::code)
				.containsExactly("TIMESTAMP", "SoilWater_1", "SoilTemp_1");
		assertThat(parsedFile.rows()).hasSize(1);
		assertThat(parsedFile.issues()).isEmpty();
	}

	@Test
	void parsesValidEt0DailyFileAndWarnsOnDuplicateDayOnly() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("ET0_Yazid.dat", """
				"TOA5","CR1000"
				"TIMESTAMP","Cumu_Et0"
				"TS","mm"
				"","Tot"
				"2026-02-09 00:00:00",3.2
				"2026-02-09 23:59:00",3.5
				""", DatFileType.ET0_DAILY));

		assertThat(parsedFile.rows()).hasSize(2);
		assertThat(parsedFile.issues()).hasSize(1);
		assertThat(parsedFile.issues().get(0).severity()).isEqualTo(DatParseIssueSeverity.WARNING);
		assertThat(parsedFile.issues().get(0).message()).contains("same calendar day");
	}

	@Test
	void parsesQuotedCsvFields() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("MTO_Quoted.dat",
				"\"TOA5\",\"CR1000\"\n"
						+ "\"TIMESTAMP\",\"Sensor, With Comma\",\"Escaped \"\"Quote\"\"\"\n"
						+ "\"TS\",\"Deg C\",\"%\"\n"
						+ "\"\",\"Avg\",\"Avg\"\n"
						+ "\"2026-02-09 13:30:00\",\"20.5\",\"61.2\"\n",
				DatFileType.THIRTY_MINUTE));

		assertThat(parsedFile.variables()).extracting(ParsedVariableHeader::code)
				.containsExactly("TIMESTAMP", "Sensor, With Comma", "Escaped \"Quote\"");
		assertThat(parsedFile.rows().get(0).values().get(1).numericValue()).isEqualTo(20.5);
	}

	@Test
	void allowsEmptyUnitAndAggregation() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("MTO_EmptyMetadata.dat", """
				"TOA5","CR1000"
				"TIMESTAMP","RawValue"
				"TS",""
				"",""
				"2026-02-09 13:30:00",7
				""", DatFileType.THIRTY_MINUTE));

		assertThat(parsedFile.variables().get(1).unit()).isEmpty();
		assertThat(parsedFile.variables().get(1).aggregation()).isEmpty();
		assertThat(parsedFile.issues()).isEmpty();
	}

	@Test
	void rejectsUnequalHeaderColumnCounts() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("MTO_BadHeader.dat", """
				"TOA5","CR1000"
				"TIMESTAMP","A","B"
				"TS","unit"
				"","Avg","Avg"
				"2026-02-09 13:30:00",1,2
				""", DatFileType.THIRTY_MINUTE));

		assertThat(parsedFile.variables()).isEmpty();
		assertThat(parsedFile.rows()).isEmpty();
		assertThat(parsedFile.issues()).singleElement()
				.extracting(DatParseIssue::message)
				.asString()
				.contains("same column count");
	}

	@Test
	void rejectsMissingTimestampColumn() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("MTO_NoTimestamp.dat", """
				"TOA5","CR1000"
				"Time","A"
				"TS","unit"
				"","Avg"
				"2026-02-09 13:30:00",1
				""", DatFileType.THIRTY_MINUTE));

		assertThat(parsedFile.variables()).isEmpty();
		assertThat(parsedFile.issues()).singleElement()
				.extracting(DatParseIssue::message)
				.asString()
				.contains("TIMESTAMP");
	}

	@Test
	void rejectsDuplicateVariableCodesCaseInsensitively() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("MTO_Duplicate.dat", """
				"TOA5","CR1000"
				"TIMESTAMP","AirTC_Avg","airtc_avg"
				"TS","Deg C","Deg C"
				"","Avg","Avg"
				"2026-02-09 13:30:00",1,2
				""", DatFileType.THIRTY_MINUTE));

		assertThat(parsedFile.variables()).isEmpty();
		assertThat(parsedFile.issues()).singleElement()
				.extracting(DatParseIssue::message)
				.asString()
				.contains("Duplicate");
	}

	@Test
	void classifiesNumericValuesWithoutReplacingInvalidOrMissingWithZero() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("MTO_NumericCleaning.dat", """
				"TOA5","CR1000"
				"TIMESTAMP","Zero","Negative","Empty","NaNValue","NullValue","InfValue","Malformed"
				"TS","","","","","","",""
				"","","","","","","",""
				"2026-02-09 13:30:00",0,-2.5,"",NaN,null,INF,abc
				""", DatFileType.THIRTY_MINUTE));

		ParsedDataRow row = parsedFile.rows().get(0);
		assertThat(row.values().get(1).status()).isEqualTo(ValueStatus.VALID);
		assertThat(row.values().get(1).numericValue()).isEqualTo(0.0);
		assertThat(row.values().get(2).status()).isEqualTo(ValueStatus.VALID);
		assertThat(row.values().get(2).numericValue()).isEqualTo(-2.5);
		assertThat(row.values().get(3).status()).isEqualTo(ValueStatus.MISSING);
		assertThat(row.values().get(3).numericValue()).isNull();
		assertThat(row.values().get(4).status()).isEqualTo(ValueStatus.INVALID);
		assertThat(row.values().get(5).status()).isEqualTo(ValueStatus.INVALID);
		assertThat(row.values().get(6).status()).isEqualTo(ValueStatus.INVALID);
		assertThat(row.values().get(7).status()).isEqualTo(ValueStatus.INVALID);
		assertThat(parsedFile.missingValueCount()).isEqualTo(1);
		assertThat(parsedFile.invalidValueCount()).isEqualTo(4);
	}

	@Test
	void skipsRowsWithInvalidTimestampOrWrongColumnCountAndContinues() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("MTO_RowRecovery.dat", """
				"TOA5","CR1000"
				"TIMESTAMP","A","B"
				"TS","",""
				"","Avg","Avg"
				"bad timestamp",1,2
				"2026-02-09 13:30:00",1
				"2026-02-09 14:00:00",1,2,3
				
				"2026-02-09 14:30:00",3,4
				""", DatFileType.THIRTY_MINUTE));

		assertThat(parsedFile.rows()).hasSize(1);
		assertThat(parsedFile.rows().get(0).timestamp()).isEqualTo(LocalDateTime.of(2026, 2, 9, 14, 30));
		assertThat(parsedFile.skippedRowCount()).isEqualTo(3);
		assertThat(parsedFile.issues()).extracting(DatParseIssue::message)
				.anyMatch(message -> message.contains("timestamp is invalid"))
				.anyMatch(message -> message.contains("column count"));
	}

	@Test
	void keepsRowWhenOneMeasurementCellIsInvalid() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("MTO_CellRecovery.dat", """
				"TOA5","CR1000"
				"TIMESTAMP","A","B"
				"TS","",""
				"","Avg","Avg"
				"2026-02-09 13:30:00",abc,2
				""", DatFileType.THIRTY_MINUTE));

		assertThat(parsedFile.rows()).hasSize(1);
		assertThat(parsedFile.rows().get(0).values().get(1).status()).isEqualTo(ValueStatus.INVALID);
		assertThat(parsedFile.rows().get(0).values().get(2).status()).isEqualTo(ValueStatus.VALID);
		assertThat(parsedFile.rows().get(0).values().get(2).numericValue()).isEqualTo(2.0);
		assertThat(parsedFile.skippedRowCount()).isZero();
	}

	@Test
	void recordsPhysicalLineNumbers() throws IOException {
		ParsedDatFile parsedFile = parser.parse(descriptor("MTO_LineNumbers.dat", """
				"TOA5","CR1000"
				"TIMESTAMP","A"
				"TS",""
				"","Avg"
				"bad timestamp",1
				"2026-02-09 13:30:00",2
				""", DatFileType.THIRTY_MINUTE));

		assertThat(parsedFile.issues().get(0).physicalLineNumber()).isEqualTo(5);
		assertThat(parsedFile.rows().get(0).physicalLineNumber()).isEqualTo(6);
	}

	private DatFileDescriptor descriptor(String fileName, String content, DatFileType fileType) throws IOException {
		Path path = tempDir.resolve(fileName);
		Files.writeString(path, content);
		return new DatFileDescriptor(path, fileName, stationCode(fileName), fileType);
	}

	private String stationCode(String fileName) {
		return fileName.substring(0, fileName.length() - ".dat".length()).toLowerCase();
	}
}
