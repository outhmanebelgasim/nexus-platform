package com.nexus.importer.measurement;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ParameterizedPreparedStatementSetter;
import org.springframework.stereotype.Repository;

@Repository
public class MeasurementBatchUpsertDao {

	private static final String UPSERT_SQL = """
			INSERT INTO measurements (
			    variable_id,
			    measured_at,
			    numeric_value,
			    text_value,
			    quality,
			    import_batch_id,
			    created_at
			)
			VALUES (?, ?, ?, NULL, 'VALID', ?, ?)
			ON CONFLICT (measured_at, variable_id) DO UPDATE
			SET numeric_value = EXCLUDED.numeric_value,
			    text_value = EXCLUDED.text_value,
			    quality = EXCLUDED.quality,
			    import_batch_id = EXCLUDED.import_batch_id
			WHERE measurements.numeric_value IS DISTINCT FROM EXCLUDED.numeric_value
			   OR measurements.text_value IS DISTINCT FROM EXCLUDED.text_value
			   OR measurements.quality IS DISTINCT FROM EXCLUDED.quality
			""";

	private final JdbcTemplate jdbcTemplate;

	public MeasurementBatchUpsertDao(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public Map<MeasurementKey, ExistingMeasurementValue> findExistingValues(List<MeasurementImportCandidate> candidates) {
		Map<MeasurementKey, ExistingMeasurementValue> existingValues = new HashMap<>();
		if (candidates.isEmpty()) {
			return existingValues;
		}

		StringBuilder sql = new StringBuilder("""
				SELECT variable_id, measured_at, numeric_value
				FROM measurements
				WHERE (variable_id, measured_at) IN (
				""");
		for (int index = 0; index < candidates.size(); index++) {
			if (index > 0) {
				sql.append(", ");
			}
			sql.append("(?, ?)");
		}
		sql.append(")");

		Object[] args = new Object[candidates.size() * 2];
		for (int index = 0; index < candidates.size(); index++) {
			MeasurementImportCandidate candidate = candidates.get(index);
			args[index * 2] = candidate.variableId();
			args[index * 2 + 1] = Timestamp.from(candidate.measuredAt());
		}

		jdbcTemplate.query(sql.toString(), rs -> {
			Long variableId = rs.getLong("variable_id");
			Instant measuredAt = rs.getTimestamp("measured_at").toInstant();
			ExistingMeasurementValue value = new ExistingMeasurementValue(variableId, measuredAt, rs.getDouble("numeric_value"));
			existingValues.put(new MeasurementKey(variableId, measuredAt), value);
		}, args);
		return existingValues;
	}

	public int[][] upsert(List<MeasurementImportCandidate> candidates, int batchSize) {
		return jdbcTemplate.batchUpdate(
				UPSERT_SQL,
				candidates,
				batchSize,
				(ParameterizedPreparedStatementSetter<MeasurementImportCandidate>) this::setUpsertValues);
	}

	private void setUpsertValues(PreparedStatement statement, MeasurementImportCandidate candidate) throws java.sql.SQLException {
		statement.setLong(1, candidate.variableId());
		statement.setTimestamp(2, Timestamp.from(candidate.measuredAt()));
		statement.setDouble(3, candidate.numericValue());
		statement.setObject(4, candidate.importBatchId());
		statement.setTimestamp(5, Timestamp.from(candidate.createdAt()));
	}

}
