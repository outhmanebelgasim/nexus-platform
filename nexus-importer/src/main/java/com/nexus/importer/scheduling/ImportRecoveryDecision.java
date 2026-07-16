package com.nexus.importer.scheduling;

public record ImportRecoveryDecision(
		boolean importRequired,
		boolean forceFullRescan,
		String reason) {

	public static ImportRecoveryDecision importRequired(String reason) {
		return new ImportRecoveryDecision(true, false, reason);
	}

	public static ImportRecoveryDecision fullRescan(String reason) {
		return new ImportRecoveryDecision(true, true, reason);
	}

	public static ImportRecoveryDecision skip(String reason) {
		return new ImportRecoveryDecision(false, false, reason);
	}
}
