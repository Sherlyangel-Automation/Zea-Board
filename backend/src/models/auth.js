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
    role: row.role
  };
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
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
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
        INSERT INTO app_users (name, email, username, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
      `,
      [user.name, user.email, user.username, hashPassword(user.password), user.role]
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

export async function deleteSession(token) {
  if (!token) return;
  await ensureAuthTables();
  await pool.query('DELETE FROM app_sessions WHERE token_hash = $1', [hashToken(token)]);
}
