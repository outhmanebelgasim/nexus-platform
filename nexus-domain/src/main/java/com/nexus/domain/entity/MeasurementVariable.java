package com.nexus.domain.entity;

import com.nexus.domain.enums.MeasurementVariableDataType;
import com.nexus.domain.enums.MeasurementType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "measurement_variables",
        uniqueConstraints = @UniqueConstraint(name = "uk_measurement_variable_station_code", columnNames = {"station_id", "code"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeasurementVariable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;

    @Column(nullable = false, length = 150)
    private String code;

    @Column(name = "display_name", length = 150)
    private String displayName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 30)
    private String unit;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 30)
    private MeasurementVariableDataType dataType;

    @Enumerated(EnumType.STRING)
    @Column(name = "measurement_type", length = 80)
    private MeasurementType measurementType;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "first_seen_at")
    private Instant firstSeenAt;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "measurementVariable")
    private List<Measurement> measurements = new ArrayList<>();
}
