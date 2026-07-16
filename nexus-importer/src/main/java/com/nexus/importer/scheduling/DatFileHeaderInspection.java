package com.nexus.importer.scheduling;

import java.util.List;

import com.nexus.importer.parser.DatParseIssue;
import com.nexus.importer.parser.ParsedVariableHeader;

public record DatFileHeaderInspection(
		List<ParsedVariableHeader> variables,
		List<DatParseIssue> issues) {
}
