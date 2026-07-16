package com.nexus.importer.file;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.nio.file.attribute.PosixFilePermission;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.nexus.importer.config.NexusImporterProperties;

class DatFileScannerTest {

	private static final Instant NOW = Instant.parse("2026-07-15T12:00:00Z");
	private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

	@TempDir
	private Path tempDir;

	@Test
	void scansAcceptedDatFiles() throws IOException {
		Path file = oldFile("MTO_Yazid.dat");

		List<DatFileDescriptor> discoveredFiles = scanner(tempDir).scan();

		assertThat(discoveredFiles).extracting(DatFileDescriptor::path).containsExactly(file);
	}

	@Test
	void ignoresModemDatFilesCaseInsensitively() throws IOException {
		oldFile("station_modem.dat");
		oldFile("station_MODEM.DAT");
		Path supportedFile = oldFile("MTO_Yazid.dat");

		List<DatFileDescriptor> discoveredFiles = scanner(tempDir).scan();

		assertThat(discoveredFiles).extracting(DatFileDescriptor::path).containsExactly(supportedFile);
	}

	@Test
	void ignoresNonDatFiles() throws IOException {
		oldFile("station.txt");
		Path supportedFile = oldFile("MTO_Yazid.dat");

		List<DatFileDescriptor> discoveredFiles = scanner(tempDir).scan();

		assertThat(discoveredFiles).extracting(DatFileDescriptor::path).containsExactly(supportedFile);
	}

	@Test
	void ignoresSubdirectories() throws IOException {
		Path nestedDirectory = Files.createDirectory(tempDir.resolve("nested.dat"));
		oldFile(nestedDirectory.resolve("MTO_Nested.dat"));
		Path supportedFile = oldFile("MTO_Yazid.dat");

		List<DatFileDescriptor> discoveredFiles = scanner(tempDir).scan();

		assertThat(discoveredFiles).extracting(DatFileDescriptor::path).containsExactly(supportedFile);
	}

	@Test
	void classifiesEt0FilesAsDaily() throws IOException {
		oldFile("ET0_20260715.dat");

		List<DatFileDescriptor> discoveredFiles = scanner(tempDir).scan();

		assertThat(discoveredFiles).extracting(DatFileDescriptor::fileType)
				.containsExactly(DatFileType.ET0_DAILY);
	}

	@Test
	void classifiesOtherDatFilesAsThirtyMinute() throws IOException {
		oldFile("MTO_Yazid.dat");

		List<DatFileDescriptor> discoveredFiles = scanner(tempDir).scan();

		assertThat(discoveredFiles).extracting(DatFileDescriptor::fileType)
				.containsExactly(DatFileType.THIRTY_MINUTE);
	}

	@Test
	void extractsConfirmedStationCodesAndFileTypes() throws IOException {
		oldFile("ET0_Yazid.dat");
		oldFile("ET0_Lounasda.dat");
		oldFile("MTO_Yazid.dat");
		oldFile("MTO_Lounasda.dat");
		oldFile("FOS_Lahna_humidite_sol_All.dat");
		oldFile("FOS_Yazid_humidite_sol_All.dat");

		List<DatFileDescriptor> discoveredFiles = scanner(tempDir).scan();

		assertThat(discoveredFiles).extracting(DatFileDescriptor::originalFilename)
				.containsExactly(
						"ET0_Lounasda.dat",
						"ET0_Yazid.dat",
						"FOS_Lahna_humidite_sol_All.dat",
						"FOS_Yazid_humidite_sol_All.dat",
						"MTO_Lounasda.dat",
						"MTO_Yazid.dat");
		assertThat(discoveredFiles).extracting(DatFileDescriptor::stationCode)
				.containsExactly(
						"et0_lounasda",
						"et0_yazid",
						"fos_lahna",
						"fos_yazid",
						"mto_lounasda",
						"mto_yazid");
		assertThat(discoveredFiles).extracting(DatFileDescriptor::fileType)
				.containsExactly(
						DatFileType.ET0_DAILY,
						DatFileType.ET0_DAILY,
						DatFileType.THIRTY_MINUTE,
						DatFileType.THIRTY_MINUTE,
						DatFileType.THIRTY_MINUTE,
						DatFileType.THIRTY_MINUTE);
	}

	@Test
	void extractsStationCodeFromFirstTwoSegmentsAndIgnoresRemainingContent() throws IOException {
		oldFile("MTO_yazid_30min.dat");
		oldFile("ET0_yazid_daily.dat");
		oldFile("FOS_lahna_humidite_sol_All.dat");
		oldFile("ABC_newstation_sensor_data.dat");
		oldFile("MTO_yazid.dat");

		List<DatFileDescriptor> discoveredFiles = scanner(tempDir).scan();

		assertThat(discoveredFiles).extracting(DatFileDescriptor::originalFilename)
				.containsExactly(
						"ABC_newstation_sensor_data.dat",
						"ET0_yazid_daily.dat",
						"FOS_lahna_humidite_sol_All.dat",
						"MTO_yazid.dat",
						"MTO_yazid_30min.dat");
		assertThat(discoveredFiles).extracting(DatFileDescriptor::stationCode)
				.containsExactly("abc_newstation", "et0_yazid", "fos_lahna", "mto_yazid", "mto_yazid");
		assertThat(discoveredFiles).extracting(DatFileDescriptor::fileType)
				.containsExactly(
						DatFileType.THIRTY_MINUTE,
						DatFileType.ET0_DAILY,
						DatFileType.THIRTY_MINUTE,
						DatFileType.THIRTY_MINUTE,
						DatFileType.THIRTY_MINUTE);
	}

	@Test
	void extractsStationCodesCaseInsensitivelyAndNormalizesToLowercase() throws IOException {
		oldFile("et0_YAZID_daily.DAT");
		oldFile("mto_LOUNASDA_30MIN.DAT");
		oldFile("fos_LAHNA_HUMIDITE_SOL_ALL.dat");
		oldFile("ABC_NewStation_sensor_data.dat");

		List<DatFileDescriptor> discoveredFiles = scanner(tempDir).scan();

		assertThat(discoveredFiles).extracting(DatFileDescriptor::stationCode)
				.containsExactly("abc_newstation", "et0_yazid", "fos_lahna", "mto_lounasda");
		assertThat(discoveredFiles).extracting(DatFileDescriptor::fileType)
				.containsExactly(
						DatFileType.THIRTY_MINUTE,
						DatFileType.ET0_DAILY,
						DatFileType.THIRTY_MINUTE,
						DatFileType.THIRTY_MINUTE);
	}

	@Test
	void skipsMalformedDatFilenames() throws IOException {
		oldFile("station.dat");
		oldFile("MTO.dat");
		oldFile("ET0_.dat");
		oldFile("ABCD_site.dat");
		oldFile("A1C_site.dat");
		oldFile("_site.dat");
		Path supportedFile = oldFile("MTO_Yazid.dat");

		List<DatFileDescriptor> discoveredFiles = scanner(tempDir).scan();

		assertThat(discoveredFiles).extracting(DatFileDescriptor::path).containsExactly(supportedFile);
	}

	@Test
	void rejectsMissingDirectory() {
		Path missingDirectory = tempDir.resolve("missing");

		assertThatThrownBy(() -> scanner(missingDirectory).scan())
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("does not exist");
	}

	@Test
	void rejectsPathThatIsNotDirectory() throws IOException {
		Path fileInsteadOfDirectory = oldFile("not-a-directory.dat");

		assertThatThrownBy(() -> scanner(fileInsteadOfDirectory).scan())
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("not a directory");
	}

	@Test
	void rejectsUnreadableDirectory() throws IOException {
		Path unreadableDirectory = Files.createDirectory(tempDir.resolve("unreadable"));
		Set<PosixFilePermission> originalPermissions = Files.getPosixFilePermissions(unreadableDirectory);
		try {
			Files.setPosixFilePermissions(unreadableDirectory, Set.of());

			assertThatThrownBy(() -> scanner(unreadableDirectory).scan())
					.isInstanceOf(IllegalStateException.class)
					.hasMessageContaining("not readable");
		}
		finally {
			Files.setPosixFilePermissions(unreadableDirectory, originalPermissions);
		}
	}

	private DatFileScanner scanner(Path inputDirectory) {
		return new DatFileScanner(new NexusImporterProperties(
				inputDirectory,
				true,
					Duration.ofMinutes(30),
					Duration.ofSeconds(10),
					Duration.ofMinutes(2),
					ZoneId.of("Africa/Casablanca"),
					500), new DatFileMetadataParser(), CLOCK);
	}

	private Path oldFile(String fileName) throws IOException {
		return oldFile(tempDir.resolve(fileName));
	}

	private Path oldFile(Path path) throws IOException {
		Files.createDirectories(path.getParent());
		Files.writeString(path, "test");
		Files.setLastModifiedTime(path, FileTime.from(NOW.minus(Duration.ofMinutes(3))));
		return path;
	}

}
