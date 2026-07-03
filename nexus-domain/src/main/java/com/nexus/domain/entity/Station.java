package com.nexus.domain.entity;

import com.nexus.domain.enums.StationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "stations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Station {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "farm_id", nullable = false)
    private Farm farm;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String code;

    private Double latitude;

    private Double longitude;

    private Double altitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StationStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "station")
    private List<Sensor> sensors = new ArrayList<>();
}
