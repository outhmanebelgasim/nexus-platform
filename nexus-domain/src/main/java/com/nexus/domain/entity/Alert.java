package com.nexus.domain.entity;

import com.nexus.domain.enums.AlertSeverity;
import com.nexus.domain.enums.AlertStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sensor_id", nullable = false)
    private Sensor sensor;

    @Column(name = "alert_type", nullable = false, length = 80)
    private String alertType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AlertSeverity severity;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AlertStatus status;

    @Column(name = "triggered_at", nullable = false)
    private Instant triggeredAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;
}