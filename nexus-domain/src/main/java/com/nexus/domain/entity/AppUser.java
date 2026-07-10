package com.nexus.domain.entity;

import com.nexus.domain.enums.Role;
import com.nexus.domain.enums.MeasurementType;
import com.nexus.domain.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "created_by_id")
    private Long createdById;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Builder.Default
    @ManyToMany
    @JoinTable(
            name = "user_farm_access",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "farm_id")
    )
    private Set<Farm> farms = new HashSet<>();

    @Builder.Default
    @ManyToMany
    @JoinTable(
            name = "user_station_access",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "station_id")
    )
    private Set<Station> stations = new HashSet<>();

    @Builder.Default
    @ElementCollection(targetClass = MeasurementType.class)
    @CollectionTable(name = "user_measurement_type_access", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "measurement_type", nullable = false, length = 80)
    private Set<MeasurementType> allowedMeasurementTypes = new HashSet<>();
}
