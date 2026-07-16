package com.nexus.importer.station;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import com.nexus.domain.entity.Farm;
import com.nexus.domain.entity.Station;
import com.nexus.domain.enums.StationStatus;
import com.nexus.importer.file.DatFileDescriptor;
import com.nexus.importer.file.DatFileType;
import com.nexus.importer.repository.ImporterFarmRepository;
import com.nexus.importer.repository.ImporterStationRepository;

class StationDiscoveryServiceTest {

	private static final Instant NOW = Instant.parse("2026-07-15T12:00:00Z");
	private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

	private final ImporterFarmRepository farmRepository = org.mockito.Mockito.mock(ImporterFarmRepository.class);
	private final ImporterStationRepository stationRepository = org.mockito.Mockito.mock(ImporterStationRepository.class);
	private final StationDiscoveryService service = new StationDiscoveryService(farmRepository, stationRepository, null, CLOCK);

	@Test
	void createsPlaceholderFarmOnce() {
		Farm savedFarm = placeholderFarm();
		when(farmRepository.findBySystemKey(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.empty(), Optional.of(savedFarm));
		when(farmRepository.saveAndFlush(any(Farm.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Farm createdFarm = service.ensurePlaceholderFarm();
		Farm existingFarm = service.ensurePlaceholderFarm();

		assertThat(createdFarm.getName()).isEqualTo(StationDiscoveryService.UNASSIGNED_FARM_NAME);
		assertThat(createdFarm.getSystemKey()).isEqualTo(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY);
		assertThat(existingFarm).isSameAs(savedFarm);
		verify(farmRepository).saveAndFlush(any(Farm.class));
	}

	@Test
	void repeatedStartupDoesNotDuplicatePlaceholderFarm() {
		Farm existingFarm = placeholderFarm();
		when(farmRepository.findBySystemKey(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(existingFarm));

		Farm farm = service.ensurePlaceholderFarm();

		assertThat(farm).isSameAs(existingFarm);
		verify(farmRepository, never()).saveAndFlush(any(Farm.class));
	}

	@Test
	void reusesExistingStationCaseInsensitivelyAndDoesNotOverwriteAdminMetadata() {
		Station existingStation = Station.builder()
				.id(10L)
				.farm(realFarm())
				.name("Admin Edited Name")
				.code("MTO_YAZID")
				.latitude(31.1)
				.longitude(-7.9)
				.altitude(450.0)
				.status(StationStatus.ACTIVE)
				.discoveredByImporter(false)
				.sourceFilename("admin.csv")
				.build();
		when(stationRepository.findByCodeIgnoreCase("mto_yazid")).thenReturn(Optional.of(existingStation));
		when(farmRepository.findBySystemKey(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(placeholderFarm()));
		when(farmRepository.findBySystemKeyForUpdate(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(placeholderFarm()));

		ResolvedStation resolvedStation = service.resolve(descriptor("MTO_Yazid.dat", "mto_yazid", DatFileType.THIRTY_MINUTE));

		assertThat(resolvedStation.created()).isFalse();
		assertThat(resolvedStation.station()).isSameAs(existingStation);
		assertThat(existingStation.getName()).isEqualTo("Admin Edited Name");
		assertThat(existingStation.getFarm().getName()).isEqualTo("Configured Farm");
		assertThat(existingStation.getLatitude()).isEqualTo(31.1);
		assertThat(existingStation.getSourceFilename()).isEqualTo("admin.csv");
		assertThat(existingStation.getLastSeenAt()).isEqualTo(NOW);
		verify(stationRepository, never()).saveAndFlush(any(Station.class));
	}

	@Test
	void createsNewStationUnderPlaceholderFarm() {
		Farm placeholderFarm = placeholderFarm();
		when(stationRepository.findByCodeIgnoreCase("fos_lahna")).thenReturn(Optional.empty());
		when(farmRepository.findBySystemKey(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(placeholderFarm));
		when(farmRepository.findBySystemKeyForUpdate(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(placeholderFarm));
		when(stationRepository.saveAndFlush(any(Station.class))).thenAnswer(invocation -> invocation.getArgument(0));

		ResolvedStation resolvedStation = service.resolve(descriptor(
				"FOS_Lahna_humidite_sol_All.dat",
				"fos_lahna",
				DatFileType.THIRTY_MINUTE));

		assertThat(resolvedStation.created()).isTrue();
		assertThat(resolvedStation.station().getFarm()).isSameAs(placeholderFarm);
		assertThat(resolvedStation.station().getCode()).isEqualTo("fos_lahna");
		assertThat(resolvedStation.station().getName()).isEqualTo("FOS Lahna");
		assertThat(resolvedStation.station().getStatus()).isEqualTo(StationStatus.INACTIVE);
		assertThat(resolvedStation.station().isDiscoveredByImporter()).isTrue();
		assertThat(resolvedStation.station().getSourceFilename()).isEqualTo("FOS_Lahna_humidite_sol_All.dat");
		assertThat(resolvedStation.station().getLastSeenAt()).isEqualTo(NOW);
	}

	@Test
	void repeatedScanDoesNotDuplicateStation() {
		Station existingStation = Station.builder()
				.id(20L)
				.farm(placeholderFarm())
				.name("MTO Yazid")
				.code("mto_yazid")
				.status(StationStatus.INACTIVE)
				.discoveredByImporter(true)
				.sourceFilename("MTO_Yazid.dat")
				.build();
		when(stationRepository.findByCodeIgnoreCase("mto_yazid")).thenReturn(Optional.of(existingStation));
		when(farmRepository.findBySystemKey(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(placeholderFarm()));
		when(farmRepository.findBySystemKeyForUpdate(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(placeholderFarm()));

		ResolvedStation resolvedStation = service.resolve(descriptor("MTO_Yazid.dat", "mto_yazid", DatFileType.THIRTY_MINUTE));

		assertThat(resolvedStation.created()).isFalse();
		verify(stationRepository, never()).saveAndFlush(any(Station.class));
	}

	@Test
	void sameStationCodeWithDifferentFilenameSuffixesReusesOneStation() {
		Farm placeholderFarm = placeholderFarm();
		Station savedStation = Station.builder()
				.id(40L)
				.farm(placeholderFarm)
				.name("MTO Yazid")
				.code("mto_yazid")
				.status(StationStatus.INACTIVE)
				.discoveredByImporter(true)
				.sourceFilename("MTO_yazid_a.dat")
				.build();
		when(stationRepository.findByCodeIgnoreCase("mto_yazid"))
				.thenReturn(Optional.empty(), Optional.of(savedStation));
		when(farmRepository.findBySystemKey(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(placeholderFarm));
		when(farmRepository.findBySystemKeyForUpdate(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(placeholderFarm));
		when(stationRepository.saveAndFlush(any(Station.class))).thenReturn(savedStation);

		ResolvedStation firstResolution = service.resolve(descriptor(
				"MTO_yazid_a.dat",
				"mto_yazid",
				DatFileType.THIRTY_MINUTE));
		ResolvedStation secondResolution = service.resolve(descriptor(
				"MTO_yazid_b.dat",
				"mto_yazid",
				DatFileType.THIRTY_MINUTE));

		assertThat(firstResolution.created()).isTrue();
		assertThat(secondResolution.created()).isFalse();
		assertThat(secondResolution.station()).isSameAs(savedStation);
		verify(stationRepository).saveAndFlush(any(Station.class));
	}

	@Test
	void handlesConcurrentDuplicateStationCreation() {
		Station concurrentlyCreatedStation = Station.builder()
				.id(30L)
				.farm(placeholderFarm())
				.name("ET0 Yazid")
				.code("et0_yazid")
				.status(StationStatus.INACTIVE)
				.build();
		when(stationRepository.findByCodeIgnoreCase("et0_yazid"))
				.thenReturn(Optional.empty(), Optional.of(concurrentlyCreatedStation));
		when(farmRepository.findBySystemKey(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(placeholderFarm()));
		when(farmRepository.findBySystemKeyForUpdate(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY))
				.thenReturn(Optional.of(placeholderFarm()));
		when(stationRepository.saveAndFlush(any(Station.class)))
				.thenThrow(new DataIntegrityViolationException("duplicate station code"));

		ResolvedStation resolvedStation = service.resolve(descriptor("ET0_Yazid.dat", "et0_yazid", DatFileType.ET0_DAILY));

		assertThat(resolvedStation.created()).isFalse();
		assertThat(resolvedStation.station()).isSameAs(concurrentlyCreatedStation);
	}

	private static DatFileDescriptor descriptor(String filename, String stationCode, DatFileType fileType) {
		return new DatFileDescriptor(Path.of("/tmp", filename), filename, stationCode, fileType);
	}

	private static Farm placeholderFarm() {
		return Farm.builder()
				.id(1L)
				.name(StationDiscoveryService.UNASSIGNED_FARM_NAME)
				.systemKey(StationDiscoveryService.UNASSIGNED_FARM_SYSTEM_KEY)
				.build();
	}

	private static Farm realFarm() {
		return Farm.builder()
				.id(2L)
				.name("Configured Farm")
				.build();
	}

}
