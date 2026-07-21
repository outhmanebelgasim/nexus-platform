package com.nexus.platform.dto.graph;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UserGraphReorderRequest(
        @NotEmpty List<@NotNull Long> graphIds
) {
}
