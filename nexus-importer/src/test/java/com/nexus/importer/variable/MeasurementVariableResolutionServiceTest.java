package com.nexus.importer.variable;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.entity.Station;
import com.nexus.domain.enums.MeasurementType;
import com.nexus.domain.enums.MeasurementVariableDataType;
import com.nexus.importer.config.NexusImporterProperties;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileType;
import com.nexus.importer.parser.DatParseIssue;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.ParsedDataRow;
import com.nexus.importer.parser.ParsedVariableHeader;
import com.nexus.importer.repository.ImporterMeasurementVariableRepository;

class MeasurementVariableResolutionServiceTest {

	private static final Instant NOW = Instant.parse("2026-07-15T12:00:00Z");
	private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
	private static final ZoneId SOURCE_ZONE = ZoneId.of("Africa/Casablanca");

	private final ImporterMeasurementVariableRepository repository = org.mockito.Mockito.mock(
			ImporterMeasurementVariableRepository.class);
	private final MeasurementVariableResolutionService service = new MeasurementVariableResolutionService(
			repository,
			new NexusImporterProperties(
					Path.of("/tmp"),
					true,
					Duration.ofMinutes(30),
					Duration.ofSeconds(10),
					Duration.ofMinutes(2),
					SOURCE_ZONE,
					500),
			CLOCK);

	@Test
	void createsVariablesForNewParsedColumnsAndIgnoresTimestamp() {
		Station station = station(10L, "mto_yazid");
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "AirTC_Avg")).thenReturn(Optional.empty());
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "batt_volt_Avg")).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any(MeasurementVariable.class))).thenAnswer(invocation -> invocation.getArgument(0));

		MeasurementVariableResolutionResult result = service.resolve(station, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg", "batt_volt_Avg"),
				units("TS", "Deg C", "Volts"),
				rows(LocalDateTime.of(2026, 2, 9, 13, 30), LocalDateTime.of(2026, 2, 9, 14, 0))));

		assertThat(result.createdCount()).isEqualTo(2);
		assertThat(result.reusedCount()).isZero();
		assertThat(result.updatedCount()).isZero();
		assertThat(result.variablesByColumnIndex()).containsOnlyKeys(1, 2);
		MeasurementVariable created = result.variablesByColumnIndex().get(1);
		assertThat(created.getStation()).isSameAs(station);
		assertThat(created.getCode()).isEqualTo("AirTC_Avg");
		assertThat(created.getDisplayName()).isNull();
		assertThat(created.getDescription()).isNull();
		assertThat(created.getUnit()).isEqualTo("Deg C");
		assertThat(created.getDataType()).isEqualTo(MeasurementVariableDataType.NUMERIC);
		assertThat(created.getMeasurementType()).isNull();
		assertThat(created.isActive()).isTrue();
		assertThat(created.getFirstSeenAt()).isEqualTo(toInstant(LocalDateTime.of(2026, 2, 9, 13, 30)));
		assertThat(created.getLastSeenAt()).isEqualTo(toInstant(LocalDateTime.of(2026, 2, 9, 14, 0)));
		assertThat(created.getCreatedAt()).isEqualTo(NOW);
		assertThat(created.getUpdatedAt()).isEqualTo(NOW);
		verify(repository, never()).findByStationId(10L);
	}

	@Test
	void reusesExistingVariableOnRepeatedResolutionAndCreatesOnlyNewColumns() {
		Station station = station(10L, "mto_yazid");
		MeasurementVariable existing = variable(100L, station, "AirTC_Avg");
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "AirTC_Avg")).thenReturn(Optional.of(existing));
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "RH_Avg")).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any(MeasurementVariable.class))).thenAnswer(invocation -> invocation.getArgument(0));

		MeasurementVariableResolutionResult result = service.resolve(station, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg", "RH_Avg"),
				units("TS", "Deg C", "%"),
				rows(LocalDateTime.of(2026, 2, 9, 13, 30))));

		assertThat(result.createdCount()).isEqualTo(1);
		assertThat(result.reusedCount()).isEqualTo(1);
		assertThat(result.variablesByColumnIndex().get(1)).isSameAs(existing);
	}

	@Test
	void variablesAreUniquePerStationAndSameCodeMayExistOnDifferentStations() {
		Station yazid = station(10L, "mto_yazid");
		Station lahna = station(20L, "mto_lahna");
		MeasurementVariable yazidVariable = variable(100L, yazid, "AirTC_Avg");
		MeasurementVariable lahnaVariable = variable(200L, lahna, "AirTC_Avg");
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "AirTC_Avg")).thenReturn(Optional.of(yazidVariable));
		when(repository.findByStationIdAndCodeIgnoreCase(20L, "AirTC_Avg")).thenReturn(Optional.of(lahnaVariable));

		MeasurementVariableResolutionResult yazidResult = service.resolve(yazid, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg"),
				units("TS", "Deg C"),
				rows(LocalDateTime.of(2026, 2, 9, 13, 30))));
		MeasurementVariableResolutionResult lahnaResult = service.resolve(lahna, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg"),
				units("TS", "Deg C"),
				rows(LocalDateTime.of(2026, 2, 9, 13, 30))));

		assertThat(yazidResult.variablesByColumnIndex().get(1)).isSameAs(yazidVariable);
		assertThat(lahnaResult.variablesByColumnIndex().get(1)).isSameAs(lahnaVariable);
	}

	@Test
	void matchingIsCaseInsensitiveAndPreservesOriginalStoredCode() {
		Station station = station(10L, "mto_yazid");
		MeasurementVariable existing = variable(100L, station, "AirTC_Avg");
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "airtc_avg")).thenReturn(Optional.of(existing));

		MeasurementVariableResolutionResult result = service.resolve(station, parsedFile(
				headers("TIMESTAMP", "airtc_avg"),
				units("TS", "Deg C"),
				rows(LocalDateTime.of(2026, 2, 9, 13, 30))));

		assertThat(result.variablesByColumnIndex().get(1).getCode()).isEqualTo("AirTC_Avg");
		assertThat(result.createdCount()).isZero();
		assertThat(result.reusedCount()).isEqualTo(1);
	}

	@Test
	void updatesSeenBoundsWithoutMovingLastSeenBackwardsAndCanMoveFirstSeenEarlier() {
		Station station = station(10L, "mto_yazid");
		MeasurementVariable existing = variable(100L, station, "AirTC_Avg");
		existing.setFirstSeenAt(toInstant(LocalDateTime.of(2026, 2, 9, 13, 30)));
		existing.setLastSeenAt(toInstant(LocalDateTime.of(2026, 2, 9, 14, 0)));
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "AirTC_Avg")).thenReturn(Optional.of(existing));

		MeasurementVariableResolutionResult olderResult = service.resolve(station, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg"),
				units("TS", "Deg C"),
				rows(LocalDateTime.of(2026, 2, 8, 12, 0))));
		assertThat(olderResult.updatedCount()).isEqualTo(1);
		assertThat(existing.getFirstSeenAt()).isEqualTo(toInstant(LocalDateTime.of(2026, 2, 8, 12, 0)));
		assertThat(existing.getLastSeenAt()).isEqualTo(toInstant(LocalDateTime.of(2026, 2, 9, 14, 0)));

		MeasurementVariableResolutionResult laterResult = service.resolve(station, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg"),
				units("TS", "Deg C"),
				rows(LocalDateTime.of(2026, 2, 10, 15, 0))));
		assertThat(laterResult.updatedCount()).isEqualTo(1);
		assertThat(existing.getLastSeenAt()).isEqualTo(toInstant(LocalDateTime.of(2026, 2, 10, 15, 0)));
		assertThat(existing.getUpdatedAt()).isEqualTo(NOW);
	}

	@Test
	void emptyParsedRowsDoNotCorruptExistingSeenBounds() {
		Station station = station(10L, "mto_yazid");
		MeasurementVariable existing = variable(100L, station, "AirTC_Avg");
		Instant firstSeenAt = toInstant(LocalDateTime.of(2026, 2, 9, 13, 30));
		Instant lastSeenAt = toInstant(LocalDateTime.of(2026, 2, 9, 14, 0));
		existing.setFirstSeenAt(firstSeenAt);
		existing.setLastSeenAt(lastSeenAt);
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "AirTC_Avg")).thenReturn(Optional.of(existing));

		MeasurementVariableResolutionResult result = service.resolve(station, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg"),
				units("TS", "Deg C"),
				List.of()));

		assertThat(result.updatedCount()).isZero();
		assertThat(existing.getFirstSeenAt()).isEqualTo(firstSeenAt);
		assertThat(existing.getLastSeenAt()).isEqualTo(lastSeenAt);
	}

	@Test
	void preservesAdminManagedMetadataAndSemanticType() {
		Station station = station(10L, "mto_yazid");
		MeasurementVariable existing = variable(100L, station, "AirTC_Avg");
		existing.setDisplayName("Air temperature");
		existing.setDescription("Configured by admin");
		existing.setMeasurementType(MeasurementType.AIR_TEMPERATURE);
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "AirTC_Avg")).thenReturn(Optional.of(existing));

		service.resolve(station, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg"),
				units("TS", "Deg C"),
				rows(LocalDateTime.of(2026, 2, 9, 13, 30))));

		assertThat(existing.getDisplayName()).isEqualTo("Air temperature");
		assertThat(existing.getDescription()).isEqualTo("Configured by admin");
		assertThat(existing.getMeasurementType()).isEqualTo(MeasurementType.AIR_TEMPERATURE);
	}

	@Test
	void populatesBlankUnitButPreservesConflictingNonblankUnit() {
		Station station = station(10L, "mto_yazid");
		MeasurementVariable blankUnit = variable(100L, station, "AirTC_Avg");
		blankUnit.setUnit(" ");
		MeasurementVariable conflictingUnit = variable(200L, station, "RH_Avg");
		conflictingUnit.setUnit("percent");
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "AirTC_Avg")).thenReturn(Optional.of(blankUnit));
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "RH_Avg")).thenReturn(Optional.of(conflictingUnit));

		MeasurementVariableResolutionResult result = service.resolve(station, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg", "RH_Avg"),
				units("TS", "Deg C", "%"),
				rows(LocalDateTime.of(2026, 2, 9, 13, 30))));

		assertThat(blankUnit.getUnit()).isEqualTo("Deg C");
		assertThat(conflictingUnit.getUnit()).isEqualTo("percent");
		assertThat(result.updatedCount()).isEqualTo(2);
		assertThat(result.unitConflictCount()).isEqualTo(1);
	}

	@Test
	void inactiveVariableIsReactivatedWhenRediscovered() {
		Station station = station(10L, "mto_yazid");
		MeasurementVariable inactive = variable(100L, station, "AirTC_Avg");
		inactive.setActive(false);
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "AirTC_Avg")).thenReturn(Optional.of(inactive));

		MeasurementVariableResolutionResult result = service.resolve(station, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg"),
				units("TS", "Deg C"),
				rows(LocalDateTime.of(2026, 2, 9, 13, 30))));

		assertThat(inactive.isActive()).isTrue();
		assertThat(result.updatedCount()).isEqualTo(1);
	}

	@Test
	void concurrentDuplicateCreationIsRecoveredByReloadingVariable() {
		Station station = station(10L, "mto_yazid");
		MeasurementVariable concurrentlyCreated = variable(100L, station, "AirTC_Avg");
		when(repository.findByStationIdAndCodeIgnoreCase(10L, "AirTC_Avg"))
				.thenReturn(Optional.empty(), Optional.of(concurrentlyCreated));
		when(repository.saveAndFlush(any(MeasurementVariable.class)))
				.thenThrow(new DataIntegrityViolationException("duplicate"));

		MeasurementVariableResolutionResult result = service.resolve(station, parsedFile(
				headers("TIMESTAMP", "AirTC_Avg"),
				units("TS", "Deg C"),
				rows(LocalDateTime.of(2026, 2, 9, 13, 30))));

		assertThat(result.createdCount()).isZero();
		assertThat(result.reusedCount()).isEqualTo(1);
		assertThat(result.variablesByColumnIndex().get(1)).isSameAs(concurrentlyCreated);
	}

	@Test
	void fatalOrEmptyParsedHeadersCreateNoVariables() {
		Station station = station(10L, "mto_yazid");

		MeasurementVariableResolutionResult result = service.resolve(station, parsedFile(
				List.of(),
				List.of(),
				rows(LocalDateTime.of(2026, 2, 9, 13, 30))));

		assertThat(result.variablesByColumnIndex()).isEmpty();
		assertThat(result.createdCount()).isZero();
		assertThat(result.reusedCount()).isZero();
		assertThat(result.updatedCount()).isZero();
		verify(repository, never()).saveAndFlush(any());
	}

	private static Station station(Long id, String code) {
		return Station.builder()
				.id(id)
				.name(code)
				.code(code)
				.createdAt(NOW)
				.build();
	}

	private static MeasurementVariable variable(Long id, Station station, String code) {
		return MeasurementVariable.builder()
				.id(id)
				.station(station)
				.code(code)
				.unit("Deg C")
				.dataType(MeasurementVariableDataType.NUMERIC)
				.active(true)
				.createdAt(NOW)
				.build();
	}

	private static ParsedDatFile parsedFile(
			List<ParsedVariableHeader> headers,
			List<String> units,
			List<ParsedDataRow> rows) {
		List<ParsedVariableHeader> headersWithUnits = headers;
		if (!units.isEmpty()) {
			headersWithUnits = new java.util.ArrayList<>();
			for (int index = 0; index < headers.size(); index++) {
				ParsedVariableHeader header = headers.get(index);
				headersWithUnits.add(new ParsedVariableHeader(
						header.columnIndex(),
						header.code(),
						units.get(index),
						"",
						header.timestampColumn()));
			}
		}
		return new ParsedDatFile(
				new DatFileDescriptor(Path.of("/tmp/MTO_Yazid.dat"), "MTO_Yazid.dat", "mto_yazid", DatFileType.THIRTY_MINUTE),
				headersWithUnits,
				rows,
				List.<DatParseIssue>of());
	}

	private static List<ParsedVariableHeader> headers(String... codes) {
		List<ParsedVariableHeader> headers = new java.util.ArrayList<>();
		for (int index = 0; index < codes.length; index++) {
			headers.add(new ParsedVariableHeader(index, codes[index], "", "", index == 0));
		}
		return headers;
	}

	private static List<String> units(String... units) {
		return List.of(units);
	}

	private static List<ParsedDataRow> rows(LocalDateTime... timestamps) {
		return java.util.Arrays.stream(timestamps)
				.map(timestamp -> new ParsedDataRow(5, timestamp, Map.of()))
				.toList();
	}

	private static Instant toInstant(LocalDateTime timestamp) {
		return timestamp.atZone(SOURCE_ZONE).toInstant();
	}
}
