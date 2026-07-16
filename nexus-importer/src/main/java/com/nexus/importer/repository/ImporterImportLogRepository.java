package com.nexus.importer.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nexus.domain.entity.ImportLog;

public interface ImporterImportLogRepository extends JpaRepository<ImportLog, Long> {

	Optional<ImportLog> findByBatchId(UUID batchId);

}
