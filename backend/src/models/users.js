import { pool } from '../db/pool.js';

export async function ensureUserTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_list (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      name TEXT,
      email TEXT,
      phone TEXT,
      extension TEXT,
      user_type TEXT,
      role TEXT,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE user_list
      ADD COLUMN IF NOT EXISTS user_type TEXT
  `);
}

function getUserType(user) {
  if (user.companyId || user.company_id) {
    return 'Agency';
  }

  if (Array.isArray(user.locations) && user.locations.length > 0) {
    return 'Agency';
  }

  if (user.locationId || user.location_id) {
    return 'Account';
  }

  return null;
}

export function normalizeUser(payload) {
  const user = payload.user || payload.data?.user || payload.data || payload;
  const firstName = user.firstName || user.first_name || '';
  const lastName = user.lastName || user.last_name || '';
  const name = user.name || [firstName, lastName].filter(Boolean).join(' ') || null;

  return {
    userId: user.id || user.userId || user.user_id,
    name,
    email: user.email || null,
    phone: user.phone || null,
    extension: user.extension || null,
    userType: getUserType(user),
    role: user.role || null,
    rawPayload: payload
  };
}

export async function upsertUser(payload) {
  await ensureUserTable();

  const normalized = normalizeUser(payload);
  if (!normalized.userId) {
    return null;
  }

  const result = await pool.query(
    `
      INSERT INTO user_list
        (user_id, name, email, phone, extension, user_type, role, raw_payload)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id)
      DO UPDATE SET
        name = COALESCE(EXCLUDED.name, user_list.name),
        email = COALESCE(EXCLUDED.email, user_list.email),
        phone = COALESCE(EXCLUDED.phone, user_list.phone),
        extension = COALESCE(EXCLUDED.extension, user_list.extension),
        user_type = COALESCE(EXCLUDED.user_type, user_list.user_type),
        role = COALESCE(EXCLUDED.role, user_list.role),
        raw_payload = EXCLUDED.raw_payload,
        updated_at = NOW()
      RETURNING *
    `,
    [
      normalized.userId,
      normalized.name,
      normalized.email,
      normalized.phone,
      normalized.extension,
      normalized.userType,
      normalized.role,
      normalized.rawPayload
    ]
  );

  return result.rows[0];
}

export async function deleteUser(userId) {
  await ensureUserTable();
  await pool.query('DELETE FROM user_list WHERE user_id = $1', [userId]);
}

export async function markUserDeleted(userId, payload = {}) {
  await ensureUserTable();

  const normalized = normalizeUser(payload);
  const fallbackName = normalized.name || userId;

  const result = await pool.query(
    `
      INSERT INTO user_list
        (user_id, name, email, phone, extension, user_type, role, raw_payload)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id)
      DO UPDATE SET
        name = CASE
          WHEN user_list.name ILIKE '%(Deleted User)' THEN user_list.name
          ELSE CONCAT(COALESCE(user_list.name, EXCLUDED.name, user_list.user_id), ' (Deleted User)')
        END,
        raw_payload = EXCLUDED.raw_payload,
        updated_at = NOW()
      RETURNING *
    `,
    [
      userId,
      `${fallbackName} (Deleted User)`,
      normalized.email,
      normalized.phone,
      normalized.extension,
      normalized.userType,
      normalized.role,
      payload
    ]
  );

  return result.rows[0];
}

export async function listUsers({ limit = 100, offset = 0 } = {}) {
  await ensureUserTable();

  const result = await pool.query(
    `
      SELECT user_id AS id, name, email, phone, extension, user_type, role, updated_at
      FROM user_list
      ORDER BY updated_at DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );

  return result.rows;
}
