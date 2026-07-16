package com.nexus.importer.scheduling;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileScanner;
import com.nexus.importer.file.DatFileType;
import com.nexus.importer.logging.ImportLogService;
import com.nexus.importer.measurement.MeasurementPersistenceResult;
import com.nexus.importer.parser.DatFileParser;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.ParsedDataRow;
import com.nexus.importer.parser.ParsedVariableHeader;
import com.nexus.importer.station.ResolvedStation;
import com.nexus.importer.station.StationDiscoveryService;
import com.nexus.importer.state.CheckpointedParsedFile;
import com.nexus.importer.state.FileImportMetadata;
import com.nexus.importer.state.ImportFileStateService;
import com.nexus.importer.state.ImportStateDecision;
import com.nexus.importer.variable.MeasurementVariableResolutionResult;

class ImporterSchedulerTest {

	private static final Instant NOW = Instant.parse("2026-07-16T12:00:00Z");

	private final DatFileScanner scanner = org.mockito.Mockito.mock(DatFileScanner.class);
	private final DatFileParser parser = org.mockito.Mockito.mock(DatFileParser.class);
	private final DatFileImportService importService = org.mockito.Mockito.mock(DatFileImportService.class);
	private final ImportLogService importLogService = org.mockito.Mockito.mock(ImportLogService.class);
	private final ImportFileStateService importFileStateService = org.mockito.Mockito.mock(ImportFileStateService.class);
	private final StationDiscoveryService stationDiscoveryService = org.mockito.Mockito.mock(StationDiscoveryService.class);
	private final ImportRecoveryDecisionService importRecoveryDecisionService = org.mockito.Mockito.mock(ImportRecoveryDecisionService.class);
	private final ImporterScheduler scheduler = new ImporterScheduler(
			scanner,
			parser,
			importService,
			importLogService,
			importFileStateService,
			stationDiscoveryService,
			importRecoveryDecisionService,
			Clock.fixed(NOW, ZoneOffset.UTC));

	@Test
	void recordsCompletedLogAfterSuccessfulImport() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat");
		ParsedDatFile parsedFile = parsedFile();
		DatFileImportResult result = importResult();
		when(scanner.scan()).thenReturn(List.of(descriptor));
		when(stationDiscoveryService.resolve(descriptor)).thenReturn(resolvedStation());
		when(importFileStateService.prepare(descriptor)).thenReturn(decision(descriptor, false));
		when(importFileStateService.headerSignature(parsedFile)).thenReturn("signature");
		when(importRecoveryDecisionService.decide(any(), any(), any(), any(), any()))
				.thenReturn(ImportRecoveryDecision.importRequired("checkpoint-not-unchanged"));
		when(parser.parse(descriptor)).thenReturn(parsedFile);
		when(importFileStateService.applyCheckpoint(any(), any(), anyBoolean())).thenReturn(checkpointed(parsedFile));
		when(importService.importFile(any(), any(), any(), any(), any(), any())).thenReturn(result);

		scheduler.scanForDatFiles();

		verify(importLogService).recordCompleted(descriptor, parsedFile, result);
	}

	@Test
	void recordsFailureLogAndContinuesOtherFiles() throws Exception {
		DatFileDescriptor failing = descriptor("MTO_Yazid.dat");
		DatFileDescriptor succeeding = descriptor("ET0_Yazid.dat");
		ParsedDatFile parsedFile = parsedFile();
		DatFileImportResult result = importResult();
		when(scanner.scan()).thenReturn(List.of(failing, succeeding));
		when(stationDiscoveryService.resolve(failing)).thenReturn(resolvedStation());
		when(stationDiscoveryService.resolve(succeeding)).thenReturn(resolvedStation());
		when(importFileStateService.prepare(failing)).thenReturn(decision(failing, false));
		when(importFileStateService.prepare(succeeding)).thenReturn(decision(succeeding, false));
		when(importFileStateService.headerSignature(parsedFile)).thenReturn("signature");
		when(importRecoveryDecisionService.decide(any(), any(), any(), any(), any()))
				.thenReturn(ImportRecoveryDecision.importRequired("checkpoint-not-unchanged"));
		when(parser.parse(failing)).thenReturn(parsedFile);
		when(parser.parse(succeeding)).thenReturn(parsedFile);
		when(importFileStateService.applyCheckpoint(any(), any(), anyBoolean())).thenReturn(checkpointed(parsedFile));
		when(importService.importFile(any(), any(), any(), any(), any(), any()))
				.thenThrow(new DataAccessResourceFailureException("database unavailable"))
				.thenReturn(result);

		scheduler.scanForDatFiles();

		verify(importLogService).recordFailed(any(), any(), any(), any(), any());
		verify(importLogService).recordCompleted(succeeding, parsedFile, result);
	}

	@Test
	void recordsSkippedLogForEmptyParsedHeaders() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat");
		ParsedDatFile parsedFile = new ParsedDatFile(descriptor, List.of(), List.of(row()), List.of());
		when(scanner.scan()).thenReturn(List.of(descriptor));
		when(stationDiscoveryService.resolve(descriptor)).thenReturn(resolvedStation());
		when(importFileStateService.prepare(descriptor)).thenReturn(decision(descriptor, false));
		when(parser.parse(descriptor)).thenReturn(parsedFile);

		scheduler.scanForDatFiles();

		verify(importLogService).recordSkipped(descriptor, parsedFile, "No usable variable headers");
	}

	@Test
	void loggingFailureDoesNotInvalidateSuccessfulImport() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat");
		ParsedDatFile parsedFile = parsedFile();
		DatFileImportResult result = importResult();
		when(scanner.scan()).thenReturn(List.of(descriptor));
		when(stationDiscoveryService.resolve(descriptor)).thenReturn(resolvedStation());
		when(importFileStateService.prepare(descriptor)).thenReturn(decision(descriptor, false));
		when(importFileStateService.headerSignature(parsedFile)).thenReturn("signature");
		when(importRecoveryDecisionService.decide(any(), any(), any(), any(), any()))
				.thenReturn(ImportRecoveryDecision.importRequired("checkpoint-not-unchanged"));
		when(parser.parse(descriptor)).thenReturn(parsedFile);
		when(importFileStateService.applyCheckpoint(any(), any(), anyBoolean())).thenReturn(checkpointed(parsedFile));
		when(importService.importFile(any(), any(), any(), any(), any(), any())).thenReturn(result);
		doThrow(new IllegalStateException("log failed"))
				.when(importLogService)
				.recordCompleted(descriptor, parsedFile, result);

		scheduler.scanForDatFiles();

		verify(importService).importFile(any(), any(), any(), any(), any(), any());
	}

	@Test
	void unchangedFileResolvesStationAndParsesBeforeSkippingWithoutImportLog() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat");
		ParsedDatFile parsedFile = parsedFile();
		when(scanner.scan()).thenReturn(List.of(descriptor));
		when(stationDiscoveryService.resolve(descriptor)).thenReturn(resolvedStation());
		when(importFileStateService.prepare(descriptor)).thenReturn(decision(descriptor, true));
		when(parser.parse(descriptor)).thenReturn(parsedFile);
		when(importFileStateService.headerSignature(parsedFile)).thenReturn("signature");
		when(importRecoveryDecisionService.decide(any(), any(), any(), any(), any()))
				.thenReturn(ImportRecoveryDecision.skip("unchanged-healthy"));

		scheduler.scanForDatFiles();

		verify(stationDiscoveryService).resolve(descriptor);
		verify(parser).parse(descriptor);
		verify(importRecoveryDecisionService).decide(any(), any(), any(), any(), any());
		org.mockito.Mockito.verifyNoInteractions(importService, importLogService);
	}

	@Test
	void unchangedFileImportsWhenRecoveryDecisionRequiresImport() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat");
		ParsedDatFile parsedFile = parsedFile();
		when(scanner.scan()).thenReturn(List.of(descriptor));
		when(stationDiscoveryService.resolve(descriptor)).thenReturn(resolvedStation());
		when(importFileStateService.prepare(descriptor)).thenReturn(decision(descriptor, true));
		when(importFileStateService.headerSignature(parsedFile)).thenReturn("signature");
		when(importRecoveryDecisionService.decide(any(), any(), any(), any(), any()))
				.thenReturn(ImportRecoveryDecision.importRequired("station-has-no-variables"));
		when(parser.parse(descriptor)).thenReturn(parsedFile);
		when(importFileStateService.applyCheckpoint(any(), any(), anyBoolean())).thenReturn(checkpointed(parsedFile));
		when(importService.importFile(any(), any(), any(), any(), any(), any())).thenReturn(importResult());

		scheduler.scanForDatFiles();

		verify(parser).parse(descriptor);
		verify(importService).importFile(any(), any(), any(), any(), any(), any());
	}

	@Test
	void newlyAddedFileIsDiscoveredOnNextScanAndResolvesStation() throws Exception {
		DatFileDescriptor firstDescriptor = descriptor("MTO_Yazid.dat");
		DatFileDescriptor secondDescriptor = descriptor("ET0_NewSite.dat");
		ParsedDatFile parsedFile = parsedFile();
		when(scanner.scan()).thenReturn(List.of(firstDescriptor), List.of(firstDescriptor, secondDescriptor));
		when(stationDiscoveryService.resolve(firstDescriptor)).thenReturn(resolvedStation());
		when(stationDiscoveryService.resolve(secondDescriptor)).thenReturn(resolvedStation());
		when(importFileStateService.prepare(firstDescriptor)).thenReturn(decision(firstDescriptor, true));
		when(importFileStateService.prepare(secondDescriptor)).thenReturn(decision(secondDescriptor, false));
		when(importFileStateService.headerSignature(parsedFile)).thenReturn("signature");
		when(importRecoveryDecisionService.decide(any(), any(), any(), any(), any()))
				.thenReturn(
						ImportRecoveryDecision.skip("unchanged-healthy"),
						ImportRecoveryDecision.skip("unchanged-healthy"),
						ImportRecoveryDecision.importRequired("checkpoint-not-unchanged"));
		when(parser.parse(firstDescriptor)).thenReturn(parsedFile);
		when(parser.parse(secondDescriptor)).thenReturn(parsedFile);
		when(importFileStateService.applyCheckpoint(any(), any(), anyBoolean())).thenReturn(checkpointed(parsedFile));
		when(importService.importFile(any(), any(), any(), any(), any(), any())).thenReturn(importResult());

		scheduler.scanForDatFiles();
		scheduler.scanForDatFiles();

		verify(stationDiscoveryService, times(2)).resolve(firstDescriptor);
		verify(stationDiscoveryService).resolve(secondDescriptor);
		verify(importService).importFile(any(), any(), any(), any(), any(), any());
	}

	private static DatFileDescriptor descriptor(String fileName) {
		return new DatFileDescriptor(Path.of("/tmp", fileName), fileName, fileName.toLowerCase().replace(".dat", ""), DatFileType.THIRTY_MINUTE);
	}

	private static ParsedDatFile parsedFile() {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat");
		return new ParsedDatFile(
				descriptor,
				List.of(new ParsedVariableHeader(0, "TIMESTAMP", "TS", "", true),
						new ParsedVariableHeader(1, "AirTC_Avg", "Deg C", "Avg", false)),
				List.of(row()),
				List.of());
	}

	private static ParsedDataRow row() {
		return new ParsedDataRow(5, LocalDateTime.of(2026, 7, 16, 12, 0), Map.of());
	}

	private static DatFileImportResult importResult() {
		return new DatFileImportResult(
				java.util.UUID.fromString("11111111-1111-1111-1111-111111111111"),
				NOW,
				NOW.plusSeconds(1),
				false,
				new MeasurementVariableResolutionResult(Map.of(), 0, 1, 0, 0),
				new MeasurementPersistenceResult(1, 1, 0, 0, 0, 0, 0, 1, Duration.ofMillis(5)));
	}

	private static ResolvedStation resolvedStation() {
		return new ResolvedStation(com.nexus.domain.entity.Station.builder()
				.id(1L)
				.code("mto_yazid")
				.name("MTO Yazid")
				.build(), false);
	}

	private static ImportStateDecision decision(DatFileDescriptor descriptor, boolean unchanged) {
		return new ImportStateDecision(
				new FileImportMetadata(descriptor.path().toString(), descriptor.originalFilename(), NOW, 100),
				null,
				unchanged);
	}

	private static CheckpointedParsedFile checkpointed(ParsedDatFile parsedFile) {
		return new CheckpointedParsedFile(parsedFile, parsedFile, "signature", false, false);
	}
}
