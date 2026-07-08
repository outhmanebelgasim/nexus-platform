ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_role;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_by_id BIGINT;

UPDATE users
SET role = 'SUPER_ADMIN'
WHERE email = 'admin@nexus.local'
  AND role = 'ADMIN';

ALTER TABLE users
    ADD CONSTRAINT chk_users_role
        CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'TECHNICIAN', 'VIEWER'));

ALTER TABLE users
    ADD CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by_id)
        REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_users_created_by
ON users(created_by_id);
