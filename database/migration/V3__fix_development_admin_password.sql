-- Development-only seed correction. Password: ChangeMe123!
-- Replace or disable this account before using a shared environment.
UPDATE users
SET password_hash = '$2a$10$XX9lyWaHuzDCqo1NOKjFq.vTERdvr5XGyEWOpcxT8et3lAmwYEUeK',
    role = 'ADMIN',
    status = 'ACTIVE',
    updated_at = NOW()
WHERE email = 'admin@nexus.local';
