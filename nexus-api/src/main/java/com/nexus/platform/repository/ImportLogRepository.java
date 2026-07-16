package com.nexus.platform.repository;

import com.nexus.domain.entity.ImportLog;
import com.nexus.domain.enums.ImportStatus;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ImportLogRepository extends JpaRepository<ImportLog, Long>, JpaSpecificationExecutor<ImportLog> {

    Optional<ImportLog> findByBatchId(UUID batchId);

    long countByStatus(ImportStatus status);

    @Query("select max(log.finishedAt) from ImportLog log")
    Instant findLastFinishedAt();

    @Query("select max(log.finishedAt) from ImportLog log where log.status = :status")
    Instant findLastFinishedAtByStatus(ImportStatus status);
}
