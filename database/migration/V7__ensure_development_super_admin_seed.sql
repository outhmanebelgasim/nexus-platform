-- Development-only seed correction. Password: ChangeMe123!
-- Replace or disable this account before using a shared environment.
INSERT INTO users (full_name, email, password_hash, role, status, created_at, updated_at)
VALUES (
    'NEXUS Administrator',
    'admin@nexus.local',
    '$2a$10$XX9lyWaHuzDCqo1NOKjFq.vTERdvr5XGyEWOpcxT8et3lAmwYEUeK',
    'SUPER_ADMIN',
    'ACTIVE',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();
