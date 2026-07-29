package com.nexus.domain.entity;

import com.nexus.domain.enums.StationCategory;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "user_graph_configurations",
        indexes = {
                @Index(name = "idx_user_graph_configurations_user_category_active", columnList = "user_id, station_category, active"),
                @Index(name = "idx_user_graph_configurations_user_station_active_order", columnList = "user_id, station_id, active, display_order"),
                @Index(name = "idx_user_graph_configurations_created_by", columnList = "created_by_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGraphConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "station_category", nullable = false, length = 30)
    private StationCategory stationCategory;

    @Column(name = "y_axis_min", nullable = false, precision = 14, scale = 4)
    private BigDecimal yAxisMin;

    @Column(name = "y_axis_max", nullable = false, precision = 14, scale = 4)
    private BigDecimal yAxisMax;

    @Column(name = "primary_axis_label", length = 120)
    private String primaryAxisLabel;

    @Column(name = "primary_axis_unit", length = 40)
    private String primaryAxisUnit;

    @Column(name = "secondary_axis_enabled", nullable = false)
    private boolean secondaryAxisEnabled;

    @Column(name = "secondary_axis_label", length = 120)
    private String secondaryAxisLabel;

    @Column(name = "secondary_axis_unit", length = 40)
    private String secondaryAxisUnit;

    @Column(name = "secondary_axis_min", precision = 14, scale = 4)
    private BigDecimal secondaryAxisMin;

    @Column(name = "secondary_axis_max", precision = 14, scale = 4)
    private BigDecimal secondaryAxisMax;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private AppUser createdBy;

    @Builder.Default
    @OneToMany(mappedBy = "graphConfiguration", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC, id ASC")
    private List<UserGraphVariable> variables = new ArrayList<>();
}
