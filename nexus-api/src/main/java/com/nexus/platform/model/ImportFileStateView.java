package com.nexus.platform.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.time.Instant;
import java.util.UUID;

@Entity
@Immutable
@Table(name = "import_file_states")
public class ImportFileStateView {

    @Id
    private Long id;

    @Column(name = "file_key", nullable = false, length = 500)
    private String fileKey;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "last_modified_at", nullable = false)
    private Instant lastModifiedAt;

    @Column(name = "file_size_bytes", nullable = false)
    private long fileSizeBytes;

    @Column(name = "last_processed_physical_line")
    private Long lastProcessedPhysicalLine;

    @Column(name = "last_processed_timestamp")
    private Instant lastProcessedTimestamp;

    @Column(name = "last_successful_batch_id")
    private UUID lastSuccessfulBatchId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ImportFileStateView() {
    }

    public ImportFileStateView(
            Long id,
            String fileKey,
            String fileName,
            Instant lastModifiedAt,
            long fileSizeBytes,
            Long lastProcessedPhysicalLine,
            Instant lastProcessedTimestamp,
            UUID lastSuccessfulBatchId,
            Instant updatedAt
    ) {
        this.id = id;
        this.fileKey = fileKey;
        this.fileName = fileName;
        this.lastModifiedAt = lastModifiedAt;
        this.fileSizeBytes = fileSizeBytes;
        this.lastProcessedPhysicalLine = lastProcessedPhysicalLine;
        this.lastProcessedTimestamp = lastProcessedTimestamp;
        this.lastSuccessfulBatchId = lastSuccessfulBatchId;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public String getFileKey() {
        return fileKey;
    }

    public String getFileName() {
        return fileName;
    }

    public Instant getLastModifiedAt() {
        return lastModifiedAt;
    }

    public long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public Long getLastProcessedPhysicalLine() {
        return lastProcessedPhysicalLine;
    }

    public Instant getLastProcessedTimestamp() {
        return lastProcessedTimestamp;
    }

    public UUID getLastSuccessfulBatchId() {
        return lastSuccessfulBatchId;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
