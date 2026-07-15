package com.nexus.importer.file;

import java.nio.file.Path;

public record DatFileDescriptor(
		Path path,
		String originalFilename,
		String stationCode,
		DatFileType fileType) {
}
