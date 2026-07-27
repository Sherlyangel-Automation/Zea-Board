import { pool } from '../db/pool.js';
import { ensureInvoiceTable } from '../models/invoices.js';
import { ensureOpportunityTable } from '../models/opportunities.js';

async function backfillCrmCreated() {
  await ensureOpportunityTable();
  await ensureInvoiceTable();

  const contacts = await pool.query(`
    ALTER TABLE contacts_list
      ADD COLUMN IF NOT EXISTS created_in_crm_on TIMESTAMPTZ
  `);

  await pool.query(`
    UPDATE contacts_list
    SET created_in_crm_on = COALESCE(
      created_in_crm_on,
      NULLIF(raw_payload->>'date_created', '')::timestamptz,
      NULLIF(raw_payload->>'dateCreated', '')::timestamptz,
      NULLIF(raw_payload->>'dateAdded', '')::timestamptz,
      NULLIF(raw_payload->>'createdAt', '')::timestamptz,
      created_at
    )
  `);

  const opportunities = await pool.query(`
    UPDATE opportunity_list
    SET created_in_crm_on = COALESCE(
      created_in_crm_on,
      ghl_created_at,
      NULLIF(raw_payload->'opportunity'->>'createdAt', '')::timestamptz,
      NULLIF(raw_payload->'opportunity'->>'dateAdded', '')::timestamptz,
      NULLIF(raw_payload->>'createdAt', '')::timestamptz,
      NULLIF(raw_payload->>'dateAdded', '')::timestamptz,
      created_at
    )
  `);

  const invoices = await pool.query(`
    UPDATE invoice_list
    SET created_in_crm_on = COALESCE(
      created_in_crm_on,
      ghl_created_at,
      NULLIF(raw_payload->'invoice'->>'createdAt', '')::timestamptz,
      NULLIF(raw_payload->>'createdAt', '')::timestamptz,
      created_at
    )
  `);

  console.log(`Backfilled contacts: ${contacts.rowCount}`);
  console.log(`Backfilled opportunities: ${opportunities.rowCount}`);
  console.log(`Backfilled invoices: ${invoices.rowCount}`);
}

backfillCrmCreated()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
