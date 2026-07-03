package com.nexus.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MeasurementId implements Serializable {

    @Column(name = "time", nullable = false)
    private Instant time;

    @Column(name = "sensor_id", nullable = false)
    private Long sensorId;
}
