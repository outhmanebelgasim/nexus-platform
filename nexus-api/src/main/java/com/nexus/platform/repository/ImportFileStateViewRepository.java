package com.nexus.platform.repository;

import com.nexus.platform.model.ImportFileStateView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImportFileStateViewRepository extends JpaRepository<ImportFileStateView, Long> {

    List<ImportFileStateView> findAllByOrderByFileNameAsc();
}
