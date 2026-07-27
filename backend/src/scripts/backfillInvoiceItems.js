import { pool } from '../db/pool.js';
import { ensureInvoiceTable, normalizeInvoice } from '../models/invoices.js';

async function backfillInvoiceItems() {
  await ensureInvoiceTable();

  const invoices = await pool.query(`
    SELECT invoice_id, raw_payload
    FROM invoice_list
    WHERE jsonb_typeof(COALESCE(raw_payload->'invoiceItems', raw_payload->'invoice'->'invoiceItems', raw_payload->'data'->'invoiceItems', raw_payload->'data'->'invoice'->'invoiceItems')) = 'array'
  `);

  let updated = 0;

  for (const invoice of invoices.rows) {
    const normalized = normalizeInvoice(invoice.raw_payload);

    await pool.query(
      `
        UPDATE invoice_list
        SET
          product_id = $2,
          price_id = $3,
          product_currency = $4,
          product_name = $5,
          product_quantity = $6,
          product_amount = $7,
          updated_at = NOW()
        WHERE invoice_id = $1
      `,
      [
        invoice.invoice_id,
        normalized.productId,
        normalized.priceId,
        normalized.productCurrency,
        normalized.productName,
        normalized.productQuantity,
        normalized.productAmount
      ]
    );

    updated += 1;
  }

  console.log(`Backfilled invoice items: ${updated}`);
}

backfillInvoiceItems()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
