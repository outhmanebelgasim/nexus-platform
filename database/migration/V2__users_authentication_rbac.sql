ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status VARCHAR(30);

UPDATE users
SET status = CASE WHEN enabled THEN 'ACTIVE' ELSE 'DISABLED' END
WHERE status IS NULL;

UPDATE users
SET role = CASE WHEN role = 'USER' THEN 'VIEWER' ELSE role END;

-- Existing pre-authentication local users did not have passwords.
-- They are disabled and receive a non-usable BCrypt hash to satisfy schema validation.
UPDATE users
SET password_hash = '$2a$10$4wAoBlFy5pUcaVKB2kPLw.nwFUA3xBKGAicfObDcRcQZamGHrSZZq',
    status = 'DISABLED'
WHERE password_hash IS NULL;

ALTER TABLE users
    ALTER COLUMN password_hash SET NOT NULL,
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE users
    DROP COLUMN IF EXISTS enabled;

ALTER TABLE users
    ADD CONSTRAINT chk_users_role
        CHECK (role IN ('ADMIN', 'TECHNICIAN', 'VIEWER')),
    ADD CONSTRAINT chk_users_status
        CHECK (status IN ('ACTIVE', 'DISABLED'));

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- Development-only seed. Password: ChangeMe123!
-- Replace or disable this account before using a shared environment.
INSERT INTO users (full_name, email, password_hash, role, status, created_at)
VALUES (
    'NEXUS Administrator',
    'admin@nexus.local',
    '$2a$10$jBWeCi5DK4BOPFUwc3U0R.pfV7gzUYLjR.45c3gMzCCj1AIQdzo0G',
    'ADMIN',
    'ACTIVE',
    NOW()
)
ON CONFLICT (email) DO NOTHING;
