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

    @Column(name = "measured_at", nullable = false)
    private Instant measuredAt;

    @Column(name = "variable_id", nullable = false)
    private Long variableId;
}
