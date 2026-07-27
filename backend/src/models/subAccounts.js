import { pool } from '../db/pool.js';
import { contactsTableName, quoteIdentifier } from '../utils/tableNames.js';

export async function ensureContactsTable(tableName) {
  const quotedTable = quoteIdentifier(tableName);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${quotedTable} (
      id BIGSERIAL PRIMARY KEY,
      contact_id TEXT NOT NULL UNIQUE,
      sub_account_id TEXT,
      sub_account_name TEXT,
      name TEXT,
      email TEXT,
      phone_number TEXT,
      tag TEXT,
      timezone TEXT,
      medium TEXT,
      source TEXT,
      assigned_user TEXT,
      user_id TEXT,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function allowSharedContactsTableName() {
  await pool.query('ALTER TABLE zea_sub_accounts DROP CONSTRAINT IF EXISTS zea_sub_accounts_contacts_table_name_key');
}

export async function createSubAccount({ name, locationId, apiKey }) {
  const tableName = contactsTableName(locationId);
  await allowSharedContactsTableName();
  await ensureContactsTable(tableName);

  const result = await pool.query(
    `
      INSERT INTO zea_sub_accounts (name, location_id, api_key, contacts_table_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (location_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        api_key = EXCLUDED.api_key,
        contacts_table_name = EXCLUDED.contacts_table_name,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id, name, location_id, contacts_table_name, is_active, last_synced_at, created_at, updated_at
    `,
    [name, locationId, apiKey, tableName]
  );

  return result.rows[0];
}

export async function listSubAccounts() {
  const result = await pool.query(`
    SELECT id, name, location_id, contacts_table_name, is_active, last_synced_at, created_at, updated_at
    FROM zea_sub_accounts
    ORDER BY created_at DESC
  `);

  return result.rows;
}

export async function getSubAccountById(id) {
  const result = await pool.query('SELECT * FROM zea_sub_accounts WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getSubAccountByLocationId(locationId) {
  const result = await pool.query('SELECT * FROM zea_sub_accounts WHERE location_id = $1', [locationId]);
  return result.rows[0] || null;
}

export async function findOrCreateWebhookSubAccount({ locationId, name }) {
  const existingSubAccount = await getSubAccountByLocationId(locationId);
  if (existingSubAccount) {
    if (name && existingSubAccount.name.startsWith('Webhook Sub-Account ')) {
      const result = await pool.query(
        'UPDATE zea_sub_accounts SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [name, existingSubAccount.id]
      );
      return result.rows[0];
    }

    return existingSubAccount;
  }

  const tableName = contactsTableName(locationId);
  await allowSharedContactsTableName();
  await ensureContactsTable(tableName);

  const result = await pool.query(
    `
      INSERT INTO zea_sub_accounts (name, location_id, api_key, contacts_table_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (location_id)
      DO UPDATE SET
        name = COALESCE(NULLIF(EXCLUDED.name, ''), zea_sub_accounts.name),
        contacts_table_name = EXCLUDED.contacts_table_name,
        updated_at = NOW()
      RETURNING *
    `,
    [name || `Webhook Sub-Account ${locationId}`, locationId, 'webhook-only', tableName]
  );

  return result.rows[0];
}

export async function markSubAccountSynced(id) {
  await pool.query('UPDATE zea_sub_accounts SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);
}
