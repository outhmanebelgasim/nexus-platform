package com.nexus.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "user_graph_variables",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_graph_variable_code",
                columnNames = {"graph_configuration_id", "variable_code"}
        ),
        indexes = {
                @Index(name = "idx_user_graph_variables_graph", columnList = "graph_configuration_id"),
                @Index(name = "idx_user_graph_variables_measurement_variable", columnList = "measurement_variable_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGraphVariable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "graph_configuration_id", nullable = false)
    private UserGraphConfiguration graphConfiguration;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "measurement_variable_id")
    private MeasurementVariable measurementVariable;

    @Column(name = "variable_code", nullable = false, length = 150)
    private String variableCode;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;
}
