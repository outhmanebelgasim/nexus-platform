package com.nexus.importer.state;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "import_file_states")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportFileState {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "file_key", nullable = false, unique = true, length = 500)
	private String fileKey;

	@Column(name = "file_name", nullable = false, length = 255)
	private String fileName;

	@Column(name = "last_modified_at", nullable = false)
	private Instant lastModifiedAt;

	@Column(name = "file_size_bytes", nullable = false)
	private long fileSizeBytes;

	@Column(name = "header_signature", nullable = false, length = 255)
	private String headerSignature;

	@Column(name = "last_processed_physical_line")
	private Long lastProcessedPhysicalLine;

	@Column(name = "last_processed_timestamp")
	private Instant lastProcessedTimestamp;

	@Column(name = "last_successful_batch_id")
	private UUID lastSuccessfulBatchId;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;
}
