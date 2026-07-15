package com.nexus.importer.repository;

import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nexus.domain.entity.Farm;

public interface ImporterFarmRepository extends JpaRepository<Farm, Long> {

	Optional<Farm> findBySystemKey(String systemKey);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select f from Farm f where f.systemKey = :systemKey")
	Optional<Farm> findBySystemKeyForUpdate(@Param("systemKey") String systemKey);

}
