import { pool } from '../db/pool.js';
import { ensureInvoiceTable } from '../models/invoices.js';

async function inspectInvoices() {
  await ensureInvoiceTable();

  const result = await pool.query(`
    SELECT invoice_id, status, livemode, amount_paid, alt_id, alt_type, name, address, phone_no, website, logo_url, invoice_number, currency, contact_id, contact_phone_no, contact_email, contact_name, company_name, amount_due, ghl_created_at, created_in_crm_on, discount, discount_type, subtotal, product_id, price_id, product_currency, product_name, product_quantity, product_amount, updated_at
    FROM invoice_list
    ORDER BY updated_at DESC
    LIMIT 20
  `);

  console.log(JSON.stringify(result.rows, null, 2));
}

inspectInvoices()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
