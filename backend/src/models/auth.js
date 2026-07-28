import crypto from 'node:crypto';
import { pool } from '../db/pool.js';

const sessionDays = 7;
const passwordIterations = 120000;
const passwordKeyLength = 64;
const passwordDigest = 'sha512';

const sampleUsers = [
  { name: 'Owner', email: 'owner@example.com', username: 'owner', password: 'Owner@123', role: 'Owner' },
  { name: 'Admin', email: 'admin@example.com', username: 'admin', password: 'Admin@123', role: 'Admin' },
  { name: 'Developer', email: 'developer@example.com', username: 'developer', password: 'Dev@123', role: 'Developer' },
  { name: 'User', email: 'user@example.com', username: 'user', password: 'User@123', role: 'User' }
];

export const permissionPages = [
  'dashboard',
  'database',
  'invoices',
  'employee-management',
  'user-management',
  'dashboard-editor',
  'customization',
  'notifications',
  'api-webhooks',
  'audit-logs'
];

const rolePermissionDefaults = {
  Developer: Object.fromEntries(permissionPages.map((page) => [page, 'edit'])),
  Owner: Object.fromEntries(permissionPages.map((page) => [page, page === 'database' ? 'hide' : 'edit'])),
  Admin: Object.fromEntries(permissionPages.map((page) => [page, page === 'database' ? 'hide' : 'edit'])),
  User: Object.fromEntries(permissionPages.map((page) => [page, page === 'user-management' ? 'view' : 'hide']))
};

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, passwordIterations, passwordKeyLength, passwordDigest).toString('hex');
  return `${passwordIterations}:${salt}:${hash}`;
}

function verifyPassword(password, storedHash = '') {
  const [iterations, salt, hash] = storedHash.split(':');
  if (!iterations || !salt || !hash) return false;
  const candidate = crypto.pbkdf2Sync(password, salt, Number(iterations), passwordKeyLength, passwordDigest).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    role: row.role,
    userType: row.role,
    permissions: normalizePermissions(row.permissions, row.role),
    createdAt: row.created_at,
    createdBy: row.created_by_name || null
  };
}

function normalizePermissions(permissions = {}, role = 'User') {
  const defaults = rolePermissionDefaults[role] || rolePermissionDefaults.User;
  const source = permissions && typeof permissions === 'object' && !Array.isArray(permissions) ? permissions : {};
  const normalizedPermissions = permissionPages.reduce((result, page) => {
    const value = source[page] || defaults[page] || 'hide';
    result[page] = ['hide', 'view', 'edit'].includes(value) ? value : 'hide';
    if (page === 'database' && role !== 'Developer') result[page] = 'hide';
    return result;
  }, {});

  Object.entries(source).forEach(([page, value]) => {
    if (String(page).startsWith('dashboard-view:') && ['hide', 'view', 'edit'].includes(value)) {
      normalizedPermissions[page] = value;
    }
  });

  return normalizedPermissions;
}

export async function ensureAuthTables() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Developer', 'User')),
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE app_users
      ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES app_users(id) ON DELETE SET NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const user of sampleUsers) {
    await pool.query(
      `
        INSERT INTO app_users (name, email, username, password_hash, role, permissions)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        ON CONFLICT (email)
        DO UPDATE SET permissions = CASE
          WHEN app_users.permissions = '{}'::jsonb THEN EXCLUDED.permissions
          ELSE app_users.permissions
        END
      `,
      [user.name, user.email, user.username, hashPassword(user.password), user.role, JSON.stringify(normalizePermissions({}, user.role))]
    );
  }
}

export async function authenticateUser(identifier, password) {
  await ensureAuthTables();
  const result = await pool.query(
    `
      SELECT *
      FROM app_users
      WHERE is_active = TRUE
        AND (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1))
      LIMIT 1
    `,
    [identifier]
  );
  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return publicUser(user);
}

export async function createSession(userId) {
  await ensureAuthTables();
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO app_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(token), expiresAt]
  );
  return { token, expiresAt };
}

export async function getUserBySessionToken(token) {
  if (!token) return null;
  await ensureAuthTables();
  const result = await pool.query(
    `
      SELECT u.*
      FROM app_sessions s
      JOIN app_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1
    `,
    [hashToken(token)]
  );
  return publicUser(result.rows[0]);
}

export async function listAppUsers() {
  await ensureAuthTables();
  const result = await pool.query(`
    SELECT u.id, u.name, u.email, u.username, u.role, u.permissions, u.created_at, creator.name AS created_by_name
    FROM app_users u
    LEFT JOIN app_users creator ON creator.id = u.created_by
    WHERE u.is_active = TRUE
    ORDER BY u.created_at DESC
  `);
  return result.rows.map(publicUser);
}

export async function createAppUser(input = {}, createdBy = null) {
  await ensureAuthTables();
  const role = input.role || input.userType || 'User';
  const email = String(input.email || '').trim().toLowerCase();
  const username = String(input.username || email.split('@')[0] || '').trim().toLowerCase();
  const permissions = normalizePermissions(input.permissions, role);

  await pool.query(
    `
      DELETE FROM app_users
      WHERE is_active = FALSE
        AND (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2))
    `,
    [email, username]
  );

  const result = await pool.query(
    `
      INSERT INTO app_users (name, email, username, password_hash, role, permissions, created_by)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      RETURNING *
    `,
    [input.name, email, username, hashPassword(input.password), role, JSON.stringify(permissions), createdBy]
  );
  return publicUser(result.rows[0]);
}

export async function updateAppUser(userId, input = {}) {
  await ensureAuthTables();
  const current = await pool.query('SELECT * FROM app_users WHERE id = $1 AND is_active = TRUE', [userId]);
  if (!current.rows[0]) return null;
  const role = input.role || input.userType || current.rows[0].role;
  const permissions = normalizePermissions(input.permissions ?? current.rows[0].permissions, role);
  const passwordSql = input.password ? ', password_hash = $7' : '';
  const params = [
    input.name || current.rows[0].name,
    String(input.email || current.rows[0].email).trim().toLowerCase(),
    String(input.username || input.email || current.rows[0].username).split('@')[0].trim().toLowerCase(),
    role,
    JSON.stringify(permissions),
    userId
  ];
  if (input.password) params.push(hashPassword(input.password));
  const result = await pool.query(
    `
      UPDATE app_users
      SET name = $1,
          email = $2,
          username = $3,
          role = $4,
          permissions = $5::jsonb,
          updated_at = NOW()
          ${passwordSql}
      WHERE id = $6
      RETURNING *
    `,
    params
  );
  return publicUser(result.rows[0]);
}

export async function deleteAppUser(userId) {
  await ensureAuthTables();
  await pool.query('DELETE FROM app_users WHERE id = $1', [userId]);
}

export async function deleteSession(token) {
  if (!token) return;
  await ensureAuthTables();
  await pool.query('DELETE FROM app_sessions WHERE token_hash = $1', [hashToken(token)]);
}
