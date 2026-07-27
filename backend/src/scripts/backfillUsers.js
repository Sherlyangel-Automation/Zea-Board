import { pool } from '../db/pool.js';
import { ensureUserTable } from '../models/users.js';

async function backfillUsers() {
  await ensureUserTable();

  const result = await pool.query(`
    UPDATE user_list
    SET user_type = CASE
      WHEN raw_payload ? 'companyId'
        OR raw_payload ? 'company_id'
        OR raw_payload ? 'locations'
        OR COALESCE(raw_payload->'user', '{}'::jsonb) ? 'companyId'
        OR COALESCE(raw_payload->'user', '{}'::jsonb) ? 'company_id'
        OR COALESCE(raw_payload->'user', '{}'::jsonb) ? 'locations'
        OR COALESCE(raw_payload->'data', '{}'::jsonb) ? 'companyId'
        OR COALESCE(raw_payload->'data', '{}'::jsonb) ? 'company_id'
        OR COALESCE(raw_payload->'data', '{}'::jsonb) ? 'locations'
        OR COALESCE(raw_payload->'data'->'user', '{}'::jsonb) ? 'companyId'
        OR COALESCE(raw_payload->'data'->'user', '{}'::jsonb) ? 'company_id'
        OR COALESCE(raw_payload->'data'->'user', '{}'::jsonb) ? 'locations'
      THEN 'Agency'
      WHEN raw_payload ? 'locationId'
        OR raw_payload ? 'location_id'
        OR COALESCE(raw_payload->'user', '{}'::jsonb) ? 'locationId'
        OR COALESCE(raw_payload->'user', '{}'::jsonb) ? 'location_id'
        OR COALESCE(raw_payload->'data', '{}'::jsonb) ? 'locationId'
        OR COALESCE(raw_payload->'data', '{}'::jsonb) ? 'location_id'
        OR COALESCE(raw_payload->'data'->'user', '{}'::jsonb) ? 'locationId'
        OR COALESCE(raw_payload->'data'->'user', '{}'::jsonb) ? 'location_id'
      THEN 'Account'
      ELSE user_type
    END
  `);

  console.log(`Backfilled user_type for ${result.rowCount} users.`);
}

backfillUsers()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
