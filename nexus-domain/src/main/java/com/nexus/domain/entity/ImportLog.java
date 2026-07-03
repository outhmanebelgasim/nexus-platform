package com.nexus.domain.entity;

import com.nexus.domain.enums.ImportStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "import_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false, unique = true)
    private UUID batchId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_path", columnDefinition = "TEXT")
    private String filePath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ImportStatus status;

    @Column(name = "total_rows")
    private Integer totalRows;

    @Column(name = "imported_rows")
    private Integer importedRows;

    @Column(name = "skipped_rows")
    private Integer skippedRows;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;
}