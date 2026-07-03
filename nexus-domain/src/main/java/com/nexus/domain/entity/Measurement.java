package com.nexus.domain.entity;

import com.nexus.domain.enums.MeasurementQuality;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "measurements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Measurement {

    @EmbeddedId
    private MeasurementId id;

    @MapsId("sensorId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sensor_id", nullable = false)
    private Sensor sensor;

    @Column(nullable = false)
    private Double value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MeasurementQuality quality;

    @Column(name = "import_batch_id")
    private UUID importBatchId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}