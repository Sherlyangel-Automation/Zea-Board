import { pool } from '../db/pool.js';

export async function ensureInvoiceTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_list (
      id BIGSERIAL PRIMARY KEY,
      invoice_id TEXT NOT NULL UNIQUE,
      status TEXT,
      livemode BOOLEAN,
      amount_paid NUMERIC,
      alt_id TEXT,
      alt_type TEXT,
      name TEXT,
      address TEXT,
      phone_no TEXT,
      website TEXT,
      logo_url TEXT,
      invoice_number TEXT,
      currency TEXT,
      contact_id TEXT,
      contact_phone_no TEXT,
      contact_email TEXT,
      contact_name TEXT,
      company_name TEXT,
      amount_due NUMERIC,
      ghl_created_at TIMESTAMPTZ,
      created_in_crm_on TIMESTAMPTZ,
      discount NUMERIC,
      discount_type TEXT,
      subtotal NUMERIC,
      product_id TEXT,
      price_id TEXT,
      product_currency TEXT,
      product_name TEXT,
      product_quantity TEXT,
      product_amount TEXT,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE invoice_list
      ADD COLUMN IF NOT EXISTS created_in_crm_on TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS discount_type TEXT
  `);

  await pool.query(`
    ALTER TABLE invoice_list
      ALTER COLUMN product_quantity TYPE TEXT USING product_quantity::text,
      ALTER COLUMN product_amount TYPE TEXT USING product_amount::text
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_delete_log (
      invoice_id TEXT PRIMARY KEY,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export function normalizeInvoice(payload) {
  const invoice = payload.invoice || payload.data?.invoice || payload.data || payload;
  const businessDetails = invoice.businessDetails || {};
  const contactDetails = invoice.contactDetails || {};
  const totalSummary = invoice.totalSummary || {};
  const invoiceItems = Array.isArray(invoice.invoiceItems) ? invoice.invoiceItems : [];
  const joinInvoiceItems = (...keys) => {
    const values = invoiceItems
      .map((item) => keys.reduce((value, key) => value ?? item[key], null))
      .filter((value) => value !== null && value !== undefined && value !== '');

    return values.length ? values.join(', ') : null;
  };

  return {
    invoiceId: invoice._id || invoice.id || invoice.invoiceId || invoice.invoice_id,
    status: invoice.status || null,
    livemode: invoice.liveMode ?? invoice.livemode ?? null,
    amountPaid: invoice.amountPaid ?? invoice.amount_paid ?? null,
    altId: invoice.altId || invoice.alt_id || null,
    altType: invoice.altType || invoice.alt_type || null,
    name: invoice.name || null,
    address: businessDetails.address || null,
    phoneNo: businessDetails.phoneNo || businessDetails.phone_no || null,
    website: businessDetails.website || null,
    logoUrl: businessDetails.logoUrl || businessDetails.logo_url || null,
    invoiceNumber: invoice.invoiceNumber || invoice.invoice_number || null,
    currency: invoice.currency || null,
    contactId: contactDetails.id || contactDetails.contactId || contactDetails.contact_id || null,
    contactPhoneNo: contactDetails.phoneNo || contactDetails.phone_no || null,
    contactEmail: contactDetails.email || null,
    contactName: contactDetails.name || null,
    companyName: contactDetails.companyName || contactDetails.company_name || null,
    amountDue: invoice.amountDue ?? invoice.amount_due ?? null,
    ghlCreatedAt: invoice.createdAt || invoice.created_at || null,
    discount: invoice.discount?.value ?? invoice.discount_value ?? totalSummary.discount ?? null,
    discountType: invoice.discount?.type || invoice.discount_type || null,
    subtotal: invoice.total ?? totalSummary.total ?? totalSummary.subTotal ?? totalSummary.subtotal ?? totalSummary.sub_total ?? null,
    productId: joinInvoiceItems('productId', 'product_id'),
    priceId: joinInvoiceItems('priceId', 'price_id'),
    productCurrency: joinInvoiceItems('currency'),
    productName: joinInvoiceItems('name'),
    productQuantity: joinInvoiceItems('qty', 'quantity'),
    productAmount: joinInvoiceItems('amount'),
    rawPayload: payload
  };
}

export async function upsertInvoice(payload) {
  await ensureInvoiceTable();

  const normalized = normalizeInvoice(payload);
  if (!normalized.invoiceId) {
    return null;
  }

  const deleted = await pool.query(
    'SELECT 1 FROM invoice_delete_log WHERE invoice_id = $1 LIMIT 1',
    [normalized.invoiceId]
  );

  if (deleted.rowCount > 0) {
    return null;
  }

  const result = await pool.query(
    `
      INSERT INTO invoice_list
        (invoice_id, status, livemode, amount_paid, alt_id, alt_type, name, address, phone_no, website, logo_url, invoice_number, currency, contact_id, contact_phone_no, contact_email, contact_name, company_name, amount_due, ghl_created_at, created_in_crm_on, discount, discount_type, subtotal, product_id, price_id, product_currency, product_name, product_quantity, product_amount, raw_payload)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::timestamptz, $20::timestamptz, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
      ON CONFLICT (invoice_id)
      DO UPDATE SET
        status = COALESCE(EXCLUDED.status, invoice_list.status),
        livemode = COALESCE(EXCLUDED.livemode, invoice_list.livemode),
        amount_paid = COALESCE(EXCLUDED.amount_paid, invoice_list.amount_paid),
        alt_id = COALESCE(EXCLUDED.alt_id, invoice_list.alt_id),
        alt_type = COALESCE(EXCLUDED.alt_type, invoice_list.alt_type),
        name = COALESCE(EXCLUDED.name, invoice_list.name),
        address = COALESCE(EXCLUDED.address, invoice_list.address),
        phone_no = COALESCE(EXCLUDED.phone_no, invoice_list.phone_no),
        website = COALESCE(EXCLUDED.website, invoice_list.website),
        logo_url = COALESCE(EXCLUDED.logo_url, invoice_list.logo_url),
        invoice_number = COALESCE(EXCLUDED.invoice_number, invoice_list.invoice_number),
        currency = COALESCE(EXCLUDED.currency, invoice_list.currency),
        contact_id = COALESCE(EXCLUDED.contact_id, invoice_list.contact_id),
        contact_phone_no = COALESCE(EXCLUDED.contact_phone_no, invoice_list.contact_phone_no),
        contact_email = COALESCE(EXCLUDED.contact_email, invoice_list.contact_email),
        contact_name = COALESCE(EXCLUDED.contact_name, invoice_list.contact_name),
        company_name = COALESCE(EXCLUDED.company_name, invoice_list.company_name),
        amount_due = COALESCE(EXCLUDED.amount_due, invoice_list.amount_due),
        ghl_created_at = COALESCE(EXCLUDED.ghl_created_at, invoice_list.ghl_created_at),
        created_in_crm_on = COALESCE(EXCLUDED.created_in_crm_on, invoice_list.created_in_crm_on),
        discount = COALESCE(EXCLUDED.discount, invoice_list.discount),
        discount_type = COALESCE(EXCLUDED.discount_type, invoice_list.discount_type),
        subtotal = COALESCE(EXCLUDED.subtotal, invoice_list.subtotal),
        product_id = COALESCE(EXCLUDED.product_id, invoice_list.product_id),
        price_id = COALESCE(EXCLUDED.price_id, invoice_list.price_id),
        product_currency = COALESCE(EXCLUDED.product_currency, invoice_list.product_currency),
        product_name = COALESCE(EXCLUDED.product_name, invoice_list.product_name),
        product_quantity = COALESCE(EXCLUDED.product_quantity, invoice_list.product_quantity),
        product_amount = COALESCE(EXCLUDED.product_amount, invoice_list.product_amount),
        raw_payload = EXCLUDED.raw_payload,
        updated_at = NOW()
      RETURNING *
    `,
    [
      normalized.invoiceId,
      normalized.status,
      normalized.livemode,
      normalized.amountPaid,
      normalized.altId,
      normalized.altType,
      normalized.name,
      normalized.address,
      normalized.phoneNo,
      normalized.website,
      normalized.logoUrl,
      normalized.invoiceNumber,
      normalized.currency,
      normalized.contactId,
      normalized.contactPhoneNo,
      normalized.contactEmail,
      normalized.contactName,
      normalized.companyName,
      normalized.amountDue,
      normalized.ghlCreatedAt,
      normalized.discount,
      normalized.discountType,
      normalized.subtotal,
      normalized.productId,
      normalized.priceId,
      normalized.productCurrency,
      normalized.productName,
      normalized.productQuantity,
      normalized.productAmount,
      normalized.rawPayload
    ]
  );

  return result.rows[0];
}

export async function deleteInvoice(invoiceId) {
  await ensureInvoiceTable();
  const result = await pool.query(
    `
      DELETE FROM invoice_list
      WHERE invoice_id = $1
        OR raw_payload->>'_id' = $1
        OR raw_payload->>'id' = $1
        OR raw_payload->>'invoiceId' = $1
        OR raw_payload->>'invoice_id' = $1
        OR raw_payload->'invoice'->>'_id' = $1
        OR raw_payload->'invoice'->>'id' = $1
        OR raw_payload->'invoice'->>'invoiceId' = $1
        OR raw_payload->'invoice'->>'invoice_id' = $1
        OR raw_payload->'data'->>'_id' = $1
        OR raw_payload->'data'->>'id' = $1
        OR raw_payload->'data'->>'invoiceId' = $1
        OR raw_payload->'data'->>'invoice_id' = $1
        OR raw_payload->'data'->'invoice'->>'_id' = $1
        OR raw_payload->'data'->'invoice'->>'id' = $1
        OR raw_payload->'data'->'invoice'->>'invoiceId' = $1
        OR raw_payload->'data'->'invoice'->>'invoice_id' = $1
    `,
    [invoiceId]
  );

  return result.rowCount;
}

export async function markInvoiceDeleted(invoiceId, payload = {}) {
  await ensureInvoiceTable();

  await pool.query(
    `
      INSERT INTO invoice_delete_log (invoice_id, raw_payload, deleted_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (invoice_id)
      DO UPDATE SET
        raw_payload = EXCLUDED.raw_payload,
        deleted_at = NOW()
    `,
    [invoiceId, payload]
  );
}


const invoiceSortColumns = {
  invoice_number: 'i.invoice_number',
  status: 'i.status',
  contact_name: 'i.contact_name',
  contact_email: 'i.contact_email',
  product_name: 'i.product_name',
  amount_paid: 'i.amount_paid',
  amount_due: 'i.amount_due',
  discount: 'i.discount',
  discount_type: 'i.discount_type',
  currency: 'i.currency',
  subaccount_name: 'subaccount_name',
  created_in_crm_on: 'i.created_in_crm_on',
  updated_at: 'i.updated_at'
};

function normalizeListOptions(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 25), 1), 500);
  const offset = Math.max(Number(options.offset || 0), 0);
  const sortBy = invoiceSortColumns[options.sortBy] ? options.sortBy : 'created_in_crm_on';
  const sortDirection = String(options.sortDirection || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  return { ...options, limit, offset, sortBy, sortDirection };
}

function buildInvoiceWhere(options = {}) {
  const where = [];
  const values = [];

  const addValue = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (options.search) {
    const placeholder = addValue(`%${String(options.search).trim().toLowerCase()}%`);
    where.push(`(
      LOWER(COALESCE(i.invoice_number, '')) LIKE ${placeholder}
      OR LOWER(COALESCE(i.contact_name, '')) LIKE ${placeholder}
      OR LOWER(COALESCE(i.contact_email, '')) LIKE ${placeholder}
      OR LOWER(COALESCE(i.product_name, '')) LIKE ${placeholder}
      OR LOWER(COALESCE(i.invoice_id, '')) LIKE ${placeholder}
    )`);
  }

  if (options.status) {
    where.push(`LOWER(COALESCE(i.status, '')) = LOWER(${addValue(options.status)})`);
  }

  if (options.currency) {
    where.push(`UPPER(COALESCE(i.currency, '')) = UPPER(${addValue(options.currency)})`);
  }

  if (options.dateFrom) {
    where.push(`COALESCE(i.created_in_crm_on, i.ghl_created_at, i.created_at) >= ${addValue(options.dateFrom)}::timestamptz`);
  }

  if (options.dateTo) {
    where.push(`COALESCE(i.created_in_crm_on, i.ghl_created_at, i.created_at) < (${addValue(options.dateTo)}::date + INTERVAL '1 day')`);
  }

  if (options.contactName) {
    where.push(`LOWER(COALESCE(i.contact_name, '')) LIKE ${addValue(`%${String(options.contactName).trim().toLowerCase()}%`)}`);
  }

  if (options.productName) {
    where.push(`LOWER(COALESCE(i.product_name, '')) LIKE ${addValue(`%${String(options.productName).trim().toLowerCase()}%`)}`);
  }

  if (options.discountType) {
    where.push(`LOWER(COALESCE(i.discount_type, '')) = LOWER(${addValue(options.discountType)})`);
  }

  if (options.subAccount) {
    where.push(`LOWER(COALESCE(s.name, c.sub_account_name, '')) LIKE ${addValue(`%${String(options.subAccount).trim().toLowerCase()}%`)}`);
  }

  return { whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '', values };
}

const invoiceSelect = `
  SELECT
    i.invoice_id,
    i.status,
    i.livemode,
    i.amount_paid,
    i.alt_id,
    i.alt_type,
    i.name,
    i.address,
    i.phone_no,
    i.website,
    i.logo_url,
    i.invoice_number,
    i.currency,
    i.contact_id,
    i.contact_phone_no,
    i.contact_email,
    i.contact_name,
    i.company_name,
    i.amount_due,
    i.ghl_created_at,
    i.created_in_crm_on,
    i.discount,
    i.discount_type,
    i.subtotal,
    i.product_id,
    i.price_id,
    i.product_currency,
    i.product_name,
    i.product_quantity,
    i.product_amount,
    COALESCE(s.location_id, c.sub_account_id) AS subaccount_id,
    COALESCE(s.name, c.sub_account_name) AS subaccount_name,
    i.updated_at
  FROM invoice_list i
  LEFT JOIN contacts_list c ON c.contact_id = i.contact_id
  LEFT JOIN zea_sub_accounts s ON s.location_id = i.alt_id
`;

export async function listInvoices(options = {}) {
  await ensureInvoiceTable();

  const normalized = normalizeListOptions(options);
  const { whereClause, values } = buildInvoiceWhere(normalized);
  const sortColumn = invoiceSortColumns[normalized.sortBy];
  const limitParam = `$${values.length + 1}`;
  const offsetParam = `$${values.length + 2}`;

  const result = await pool.query(
    `
      ${invoiceSelect}
      ${whereClause}
      ORDER BY ${sortColumn} ${normalized.sortDirection} NULLS LAST, i.updated_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `,
    [...values, normalized.limit, normalized.offset]
  );

  return result.rows;
}

export async function getInvoiceManagement(options = {}) {
  await ensureInvoiceTable();

  const normalized = normalizeListOptions(options);
  const { whereClause, values } = buildInvoiceWhere(normalized);
  const sortColumn = invoiceSortColumns[normalized.sortBy];
  const limitParam = `$${values.length + 1}`;
  const offsetParam = `$${values.length + 2}`;

  const [rowsResult, countResult, summaryResult, currencySummaryResult, filterResult] = await Promise.all([
    pool.query(
      `
        ${invoiceSelect}
        ${whereClause}
        ORDER BY ${sortColumn} ${normalized.sortDirection} NULLS LAST, i.updated_at DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `,
      [...values, normalized.limit, normalized.offset]
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM invoice_list i
        LEFT JOIN contacts_list c ON c.contact_id = i.contact_id
        LEFT JOIN zea_sub_accounts s ON s.location_id = i.alt_id
        ${whereClause}
      `,
      values
    ),
    pool.query(
      `
        SELECT
          COUNT(*)::int AS total_invoices,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(i.status, '')) = 'paid')::int AS paid_invoices,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(i.status, '')) = 'sent')::int AS sent_invoices,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(i.status, '')) = 'draft')::int AS draft_invoices,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(i.status, '')) = 'void')::int AS void_invoices,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(i.status, '')) = 'paid' THEN COALESCE(i.amount_paid, 0) ELSE 0 END), 0)::numeric AS total_amount_paid,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(i.status, '')) <> 'paid' AND LOWER(COALESCE(i.status, '')) <> 'void' THEN COALESCE(i.amount_due, 0) ELSE 0 END), 0)::numeric AS total_outstanding,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(i.status, '')) <> 'void' THEN COALESCE(i.amount_paid, 0) + COALESCE(i.amount_due, 0) ELSE 0 END), 0)::numeric AS total_invoice_value
        FROM invoice_list i
        LEFT JOIN contacts_list c ON c.contact_id = i.contact_id
        LEFT JOIN zea_sub_accounts s ON s.location_id = i.alt_id
        ${whereClause}
      `,
      values
    ),
    pool.query(
      `
        SELECT
          COALESCE(NULLIF(UPPER(i.currency), ''), 'USD') AS currency,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(i.status, '')) = 'paid' THEN COALESCE(i.amount_paid, 0) ELSE 0 END), 0)::numeric AS total_amount_paid,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(i.status, '')) <> 'paid' AND LOWER(COALESCE(i.status, '')) <> 'void' THEN COALESCE(i.amount_due, 0) ELSE 0 END), 0)::numeric AS total_outstanding,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(i.status, '')) <> 'void' THEN COALESCE(i.amount_paid, 0) + COALESCE(i.amount_due, 0) ELSE 0 END), 0)::numeric AS total_invoice_value
        FROM invoice_list i
        LEFT JOIN contacts_list c ON c.contact_id = i.contact_id
        LEFT JOIN zea_sub_accounts s ON s.location_id = i.alt_id
        ${whereClause}
        GROUP BY COALESCE(NULLIF(UPPER(i.currency), ''), 'USD')
      `,
      values
    ),
    pool.query(`
      SELECT
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(i.status, '') ORDER BY NULLIF(i.status, '')), NULL) AS statuses,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(UPPER(i.currency), '') ORDER BY NULLIF(UPPER(i.currency), '')), NULL) AS currencies,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(i.discount_type, '') ORDER BY NULLIF(i.discount_type, '')), NULL) AS discount_types,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(COALESCE(s.name, c.sub_account_name), '') ORDER BY NULLIF(COALESCE(s.name, c.sub_account_name), '')), NULL) AS subaccounts
      FROM invoice_list i
      LEFT JOIN contacts_list c ON c.contact_id = i.contact_id
      LEFT JOIN zea_sub_accounts s ON s.location_id = i.alt_id
    `)
  ]);

  return {
    invoices: rowsResult.rows,
    pagination: {
      total: countResult.rows[0]?.total || 0,
      limit: normalized.limit,
      offset: normalized.offset,
      page: Math.floor(normalized.offset / normalized.limit) + 1
    },
    summary: { ...(summaryResult.rows[0] || {}), totals_by_currency: currencySummaryResult.rows },
    filters: filterResult.rows[0] || { statuses: [], currencies: [], discount_types: [], subaccounts: [] }
  };
}
