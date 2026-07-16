package com.nexus.importer.state;

import com.nexus.importer.parser.ParsedDatFile;

public record CheckpointedParsedFile(
		ParsedDatFile fileForImport,
		ParsedDatFile fullFile,
		String headerSignature,
		boolean resumed,
		boolean reset) {
}
