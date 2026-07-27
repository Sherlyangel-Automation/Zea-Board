import { pool } from '../db/pool.js';
import { ensureInvoiceTable } from '../models/invoices.js';

async function backfillInvoices() {
  await ensureInvoiceTable();

  const result = await pool.query(`
    UPDATE invoice_list
    SET
      discount = COALESCE(
        NULLIF(raw_payload->'discount'->>'value', '')::numeric,
        NULLIF(raw_payload->'invoice'->'discount'->>'value', '')::numeric,
        NULLIF(raw_payload->'data'->'discount'->>'value', '')::numeric,
        NULLIF(raw_payload->'data'->'invoice'->'discount'->>'value', '')::numeric,
        discount
      ),
      discount_type = COALESCE(
        NULLIF(raw_payload->'discount'->>'type', ''),
        NULLIF(raw_payload->'invoice'->'discount'->>'type', ''),
        NULLIF(raw_payload->'data'->'discount'->>'type', ''),
        NULLIF(raw_payload->'data'->'invoice'->'discount'->>'type', ''),
        discount_type
      ),
      subtotal = COALESCE(
        NULLIF(raw_payload->>'total', '')::numeric,
        NULLIF(raw_payload->'invoice'->>'total', '')::numeric,
        NULLIF(raw_payload->'data'->>'total', '')::numeric,
        NULLIF(raw_payload->'data'->'invoice'->>'total', '')::numeric,
        subtotal
      )
  `);

  console.log(`Backfilled invoices: ${result.rowCount}`);
}

backfillInvoices()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
