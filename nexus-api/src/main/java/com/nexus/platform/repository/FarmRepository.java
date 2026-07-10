package com.nexus.platform.repository;

import com.nexus.domain.entity.Farm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FarmRepository extends JpaRepository<Farm, Long> {

    List<Farm> findByIdIn(List<Long> ids);
}
