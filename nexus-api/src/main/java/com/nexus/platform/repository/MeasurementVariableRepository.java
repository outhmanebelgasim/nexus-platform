package com.nexus.platform.repository;

import com.nexus.domain.entity.MeasurementVariable;
import com.nexus.domain.enums.MeasurementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface MeasurementVariableRepository extends JpaRepository<MeasurementVariable, Long> {

    List<MeasurementVariable> findByStationId(Long stationId);

    List<MeasurementVariable> findByStationIdIn(List<Long> stationIds);

    boolean existsByStationIdAndCode(Long stationId, String code);

    @Query("""
            select variable
            from MeasurementVariable variable
            where (:stationId is null or variable.station.id = :stationId)
              and (:active is null or variable.active = :active)
              and (:search is null
                   or lower(variable.code) like lower(concat('%', :search, '%'))
                   or lower(coalesce(variable.displayName, '')) like lower(concat('%', :search, '%'))
                   or lower(coalesce(variable.description, '')) like lower(concat('%', :search, '%')))
            order by variable.station.id asc, variable.code asc
            """)
    List<MeasurementVariable> search(
            @Param("stationId") Long stationId,
            @Param("active") Boolean active,
            @Param("search") String search
    );

    @Query("""
            select variable
            from MeasurementVariable variable
            where variable.station.id in :stationIds
              and (:active is null or variable.active = :active)
              and (:search is null
                   or lower(variable.code) like lower(concat('%', :search, '%'))
                   or lower(coalesce(variable.displayName, '')) like lower(concat('%', :search, '%'))
                   or lower(coalesce(variable.description, '')) like lower(concat('%', :search, '%')))
            order by variable.station.id asc, variable.code asc
            """)
    List<MeasurementVariable> searchByStationIds(
            @Param("stationIds") Collection<Long> stationIds,
            @Param("active") Boolean active,
            @Param("search") String search
    );

    List<MeasurementVariable> findByIdIn(Collection<Long> ids);

    List<MeasurementVariable> findByStationIdAndIdIn(Long stationId, Collection<Long> ids);

    List<MeasurementVariable> findByStationIdAndMeasurementTypeIn(Long stationId, Collection<MeasurementType> measurementTypes);
}
