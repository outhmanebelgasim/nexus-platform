package com.nexus.importer.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nexus.importer.state.ImportFileState;

public interface ImporterImportFileStateRepository extends JpaRepository<ImportFileState, Long> {

	Optional<ImportFileState> findByFileKey(String fileKey);

}
