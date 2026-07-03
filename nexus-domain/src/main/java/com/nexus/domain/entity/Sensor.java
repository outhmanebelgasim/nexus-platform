package com.nexus.domain.entity;

import com.nexus.domain.enums.SensorStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sensors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sensor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;

    @Column(nullable = false, unique = true, length = 150)
    private String code;

    @Column(length = 150)
    private String name;

    @Column(name = "sensor_type", nullable = false, length = 80)
    private String sensorType;

    @Column(length = 30)
    private String unit;

    @Column(name = "depth_cm")
    private Integer depthCm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SensorStatus status;

    @Column(columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "sensor")
    private List<Measurement> measurements = new ArrayList<>();
}
