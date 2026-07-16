package com.nexus.importer.state;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;

import com.nexus.importer.config.NexusImporterProperties;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileType;
import com.nexus.importer.parser.ParsedDatFile;
import com.nexus.importer.parser.ParsedDataRow;
import com.nexus.importer.parser.ParsedVariableHeader;
import com.nexus.importer.repository.ImporterImportFileStateRepository;

class ImportFileStateServiceTest {

	private static final Instant NOW = Instant.parse("2026-07-16T12:00:00Z");
	private static final UUID BATCH_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final ZoneId SOURCE_ZONE = ZoneId.of("Africa/Casablanca");

	@TempDir
	private Path tempDir;

	private final ImporterImportFileStateRepository repository = org.mockito.Mockito.mock(ImporterImportFileStateRepository.class);
	private final ImportFileStateService service = new ImportFileStateService(repository, properties(), Clock.fixed(NOW, ZoneOffset.UTC));

	@Test
	void firstImportCreatesState() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat", "first");
		ImportStateDecision decision = service.prepare(descriptor);
		ParsedDatFile parsedFile = parsedFile(descriptor, headers("TIMESTAMP", "AirTC_Avg"), row(5, LocalDateTime.of(2026, 7, 16, 12, 0)));
		CheckpointedParsedFile checkpointed = service.applyCheckpoint(parsedFile, decision);

		service.markSuccessful(descriptor, checkpointed, decision, BATCH_ID);

		ImportFileState saved = savedState();
		assertThat(saved.getFileKey()).isEqualTo(descriptor.path().toAbsolutePath().normalize().toString());
		assertThat(saved.getFileName()).isEqualTo("MTO_Yazid.dat");
		assertThat(saved.getFileSizeBytes()).isEqualTo(Files.size(descriptor.path()));
		assertThat(saved.getLastProcessedPhysicalLine()).isEqualTo(5);
		assertThat(saved.getLastProcessedTimestamp()).isEqualTo(LocalDateTime.of(2026, 7, 16, 12, 0).atZone(SOURCE_ZONE).toInstant());
		assertThat(saved.getLastSuccessfulBatchId()).isEqualTo(BATCH_ID);
		assertThat(saved.getUpdatedAt()).isEqualTo(NOW);
	}

	@Test
	void unchangedFileIsDetectedFromPersistedSizeAndModifiedTime() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat", "same");
		ImportFileState existing = existingState(descriptor, Files.size(descriptor.path()), Files.getLastModifiedTime(descriptor.path()).toInstant().truncatedTo(ChronoUnit.MICROS), "signature", 5L);
		when(repository.findByFileKey(descriptor.path().toAbsolutePath().normalize().toString())).thenReturn(Optional.of(existing));

		ImportStateDecision decision = service.prepare(descriptor);

		assertThat(decision.unchanged()).isTrue();
	}

	@Test
	void appendedRowsImportOnlyRowsAfterLastProcessedLineWhenHeaderIsUnchanged() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat", "grown");
		ParsedDatFile parsedFile = parsedFile(
				descriptor,
				headers("TIMESTAMP", "AirTC_Avg"),
				row(5, LocalDateTime.of(2026, 7, 16, 12, 0)),
				row(6, LocalDateTime.of(2026, 7, 16, 12, 30)));
		String signature = service.applyCheckpoint(parsedFile, new ImportStateDecision(metadata(descriptor), null, false)).headerSignature();
		ImportFileState existing = existingState(descriptor, 1L, Files.getLastModifiedTime(descriptor.path()).toInstant().minusSeconds(60), signature, 5L);
		ImportStateDecision decision = new ImportStateDecision(metadata(descriptor), existing, false);

		CheckpointedParsedFile checkpointed = service.applyCheckpoint(parsedFile, decision);

		assertThat(checkpointed.resumed()).isTrue();
		assertThat(checkpointed.fileForImport().rows()).extracting(ParsedDataRow::physicalLineNumber)
				.containsExactly(6L);
	}

	@Test
	void forcedHistoricalRecoveryIgnoresResumeLineAndImportsAllRows() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat", "grown");
		ParsedDatFile parsedFile = parsedFile(
				descriptor,
				headers("TIMESTAMP", "AirTC_Avg"),
				row(5, LocalDateTime.of(2026, 5, 8, 12, 30)),
				row(6, LocalDateTime.of(2026, 7, 16, 12, 30)));
		String signature = service.applyCheckpoint(parsedFile, new ImportStateDecision(metadata(descriptor), null, false)).headerSignature();
		ImportFileState existing = existingState(descriptor, 1L, Files.getLastModifiedTime(descriptor.path()).toInstant().minusSeconds(60), signature, 5L);
		ImportStateDecision decision = new ImportStateDecision(metadata(descriptor), existing, false);

		CheckpointedParsedFile checkpointed = service.applyCheckpoint(parsedFile, decision, true);

		assertThat(checkpointed.resumed()).isFalse();
		assertThat(checkpointed.reset()).isTrue();
		assertThat(checkpointed.fileForImport().rows()).extracting(ParsedDataRow::physicalLineNumber)
				.containsExactly(5L, 6L);
	}

	@Test
	void truncatedFileResetsToFullRescan() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat", "small");
		ImportFileState existing = existingState(descriptor, 999L, Files.getLastModifiedTime(descriptor.path()).toInstant().minusSeconds(60), "old", 20L);
		ParsedDatFile parsedFile = parsedFile(descriptor, headers("TIMESTAMP", "AirTC_Avg"), row(5, LocalDateTime.of(2026, 7, 16, 12, 0)));

		CheckpointedParsedFile checkpointed = service.applyCheckpoint(parsedFile, new ImportStateDecision(metadata(descriptor), existing, false));

		assertThat(checkpointed.reset()).isTrue();
		assertThat(checkpointed.fileForImport().rows()).hasSize(1);
	}

	@Test
	void changedHeaderResetsAndAllowsNewVariables() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat", "changed header");
		ImportFileState existing = existingState(descriptor, 1L, Files.getLastModifiedTime(descriptor.path()).toInstant().minusSeconds(60), "different", 5L);
		ParsedDatFile parsedFile = parsedFile(descriptor, headers("TIMESTAMP", "AirTC_Avg", "NewColumn"), row(6, LocalDateTime.of(2026, 7, 16, 12, 30)));

		CheckpointedParsedFile checkpointed = service.applyCheckpoint(parsedFile, new ImportStateDecision(metadata(descriptor), existing, false));

		assertThat(checkpointed.reset()).isTrue();
		assertThat(checkpointed.fileForImport().variables()).extracting(ParsedVariableHeader::code)
				.contains("NewColumn");
	}

	@Test
	void failedImportDoesNotAdvanceStateWhenMarkSuccessfulIsNotCalled() throws Exception {
		DatFileDescriptor descriptor = descriptor("MTO_Yazid.dat", "failure");
		service.prepare(descriptor);

		verify(repository, never()).save(any());
	}

	private ImportFileState savedState() {
		ArgumentCaptor<ImportFileState> captor = ArgumentCaptor.forClass(ImportFileState.class);
		verify(repository).save(captor.capture());
		return captor.getValue();
	}

	private DatFileDescriptor descriptor(String fileName, String content) throws Exception {
		Path path = tempDir.resolve(fileName);
		Files.writeString(path, content);
		return new DatFileDescriptor(path, fileName, "mto_yazid", DatFileType.THIRTY_MINUTE);
	}

	private FileImportMetadata metadata(DatFileDescriptor descriptor) throws Exception {
		return new FileImportMetadata(
				descriptor.path().toAbsolutePath().normalize().toString(),
				descriptor.originalFilename(),
				Files.getLastModifiedTime(descriptor.path()).toInstant(),
				Files.size(descriptor.path()));
	}

	private ImportFileState existingState(
			DatFileDescriptor descriptor,
			long size,
			Instant modifiedAt,
			String signature,
			Long lastLine) {
		return ImportFileState.builder()
				.id(1L)
				.fileKey(descriptor.path().toAbsolutePath().normalize().toString())
				.fileName(descriptor.originalFilename())
				.fileSizeBytes(size)
				.lastModifiedAt(modifiedAt)
				.headerSignature(signature)
				.lastProcessedPhysicalLine(lastLine)
				.updatedAt(NOW)
				.build();
	}

	private static ParsedDatFile parsedFile(
			DatFileDescriptor descriptor,
			List<ParsedVariableHeader> headers,
			ParsedDataRow... rows) {
		return new ParsedDatFile(descriptor, headers, List.of(rows), List.of());
	}

	private static List<ParsedVariableHeader> headers(String... codes) {
		java.util.ArrayList<ParsedVariableHeader> headers = new java.util.ArrayList<>();
		for (int index = 0; index < codes.length; index++) {
			headers.add(new ParsedVariableHeader(index, codes[index], "", "", index == 0));
		}
		return headers;
	}

	private static ParsedDataRow row(long line, LocalDateTime timestamp) {
		return new ParsedDataRow(line, timestamp, Map.of());
	}

	private static NexusImporterProperties properties() {
		return new NexusImporterProperties(
				Path.of("/tmp"),
				true,
				Duration.ofMinutes(30),
				Duration.ofSeconds(10),
				Duration.ofMinutes(2),
				SOURCE_ZONE,
				500);
	}
}
