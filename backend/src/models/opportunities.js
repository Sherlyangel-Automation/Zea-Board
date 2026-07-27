import { pool } from '../db/pool.js';
import { quoteIdentifier } from '../utils/tableNames.js';

export async function ensureOpportunityTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS opportunity_list (
      id BIGSERIAL PRIMARY KEY,
      opportunity_id TEXT NOT NULL UNIQUE,
      name TEXT,
      monetary_value NUMERIC,
      currency TEXT,
      pipeline_id TEXT,
      pipeline_stage_id TEXT,
      assigned_to TEXT,
      status TEXT,
      ghl_created_at TIMESTAMPTZ,
      created_in_crm_on TIMESTAMPTZ,
      contact_id TEXT,
      contact_tag TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      closing_date TIMESTAMPTZ,
      forecast_expected_close_date DATE,
      forecast_original_close_date DATE,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE opportunity_list
      ADD COLUMN IF NOT EXISTS forecast_expected_close_date DATE,
      ADD COLUMN IF NOT EXISTS forecast_original_close_date DATE,
      ADD COLUMN IF NOT EXISTS created_in_crm_on TIMESTAMPTZ
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS opportunity_delete_log (
      opportunity_id TEXT PRIMARY KEY,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export function normalizeOpportunity(payload) {
  const opportunity = payload.opportunity || payload.data?.opportunity || payload.data || payload;
  const contact = opportunity.contact || {};
  const contactTags = Array.isArray(contact.tags) ? contact.tags.join(', ') : contact.tags || null;

  return {
    opportunityId: opportunity.id || opportunity.opportunityId || opportunity.opportunity_id,
    name: opportunity.name || null,
    monetaryValue: opportunity.monetaryValue ?? opportunity.monetary_value ?? null,
    currency: opportunity.currency || null,
    pipelineId: opportunity.pipelineId || opportunity.pipeline_id || null,
    pipelineStageId: opportunity.pipelineStageId || opportunity.pipeline_stage_id || null,
    assignedTo: opportunity.assignedTo || opportunity.assigned_to || null,
    status: opportunity.status || null,
    ghlCreatedAt: opportunity.createdAt || opportunity.created_at || opportunity.dateAdded || opportunity.date_added || null,
    contactId: opportunity.contactId || opportunity.contact_id || contact.id || null,
    contactTag: contactTags,
    contactEmail: contact.email || opportunity.contactEmail || opportunity.contact_email || null,
    contactPhone: contact.phone || opportunity.contactPhone || opportunity.contact_phone || null,
    forecastExpectedCloseDate:
      opportunity.forecastExpectedCloseDate ||
      opportunity.forecast_expected_close_date ||
      opportunity.closingDate ||
      opportunity.closing_date ||
      opportunity.closeDate ||
      opportunity.close_date ||
      opportunity.dateOfClose ||
      opportunity.date_of_close ||
      opportunity.expectedCloseDate ||
      opportunity.expected_close_date ||
      null,
    forecastOriginalCloseDate:
      opportunity.forecastOriginalCloseDate ||
      opportunity.forecast_original_close_date ||
      opportunity.closingDate ||
      opportunity.closing_date ||
      opportunity.closeDate ||
      opportunity.close_date ||
      opportunity.dateOfClose ||
      opportunity.date_of_close ||
      null,
    rawPayload: payload
  };
}

async function getContactDetails(contactsTableName, contactId) {
  if (!contactsTableName || !contactId) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT tag, email, phone_number
      FROM ${quoteIdentifier(contactsTableName)}
      WHERE contact_id = $1
      LIMIT 1
    `,
    [contactId]
  );

  return result.rows[0] || null;
}

export async function upsertOpportunity(payload, { contactsTableName } = {}) {
  await ensureOpportunityTable();

  const normalized = normalizeOpportunity(payload);
  if (!normalized.opportunityId) {
    return null;
  }

  const deleted = await pool.query(
    'SELECT 1 FROM opportunity_delete_log WHERE opportunity_id = $1 LIMIT 1',
    [normalized.opportunityId]
  );

  if (deleted.rowCount > 0) {
    return null;
  }

  const contactDetails = await getContactDetails(contactsTableName, normalized.contactId);
  const contactTag = normalized.contactTag || contactDetails?.tag || null;
  const contactEmail = normalized.contactEmail || contactDetails?.email || null;
  const contactPhone = normalized.contactPhone || contactDetails?.phone_number || null;
  const forecastExpectedCloseDate = normalized.forecastExpectedCloseDate || null;
  const forecastOriginalCloseDate = normalized.forecastOriginalCloseDate || null;

  const result = await pool.query(
    `
      INSERT INTO opportunity_list
        (opportunity_id, name, monetary_value, currency, pipeline_id, pipeline_stage_id, assigned_to, status, ghl_created_at, created_in_crm_on, contact_id, contact_tag, contact_email, contact_phone, closing_date, forecast_expected_close_date, forecast_original_close_date, raw_payload)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $9::timestamptz, $10, $11, $12, $13, $14::timestamptz, $15::date, $16::date, $17)
      ON CONFLICT (opportunity_id)
      DO UPDATE SET
        name = COALESCE(EXCLUDED.name, opportunity_list.name),
        monetary_value = COALESCE(EXCLUDED.monetary_value, opportunity_list.monetary_value),
        currency = COALESCE(EXCLUDED.currency, opportunity_list.currency),
        pipeline_id = COALESCE(EXCLUDED.pipeline_id, opportunity_list.pipeline_id),
        pipeline_stage_id = COALESCE(EXCLUDED.pipeline_stage_id, opportunity_list.pipeline_stage_id),
        assigned_to = COALESCE(EXCLUDED.assigned_to, opportunity_list.assigned_to),
        status = COALESCE(EXCLUDED.status, opportunity_list.status),
        ghl_created_at = COALESCE(EXCLUDED.ghl_created_at, opportunity_list.ghl_created_at),
        created_in_crm_on = COALESCE(EXCLUDED.created_in_crm_on, opportunity_list.created_in_crm_on),
        contact_id = COALESCE(EXCLUDED.contact_id, opportunity_list.contact_id),
        contact_tag = COALESCE(EXCLUDED.contact_tag, opportunity_list.contact_tag),
        contact_email = COALESCE(EXCLUDED.contact_email, opportunity_list.contact_email),
        contact_phone = COALESCE(EXCLUDED.contact_phone, opportunity_list.contact_phone),
        closing_date = COALESCE(EXCLUDED.closing_date, opportunity_list.closing_date),
        forecast_expected_close_date = COALESCE(EXCLUDED.forecast_expected_close_date, opportunity_list.forecast_expected_close_date),
        forecast_original_close_date = COALESCE(EXCLUDED.forecast_original_close_date, opportunity_list.forecast_original_close_date),
        raw_payload = EXCLUDED.raw_payload,
        updated_at = NOW()
      RETURNING *
    `,
    [
      normalized.opportunityId,
      normalized.name,
      normalized.monetaryValue,
      normalized.currency,
      normalized.pipelineId,
      normalized.pipelineStageId,
      normalized.assignedTo,
      normalized.status,
      normalized.ghlCreatedAt,
      normalized.contactId,
      contactTag,
      contactEmail,
      contactPhone,
      forecastExpectedCloseDate,
      forecastExpectedCloseDate,
      forecastOriginalCloseDate,
      normalized.rawPayload
    ]
  );

  return result.rows[0];
}

export async function deleteOpportunity(opportunityId) {
  await ensureOpportunityTable();
  const result = await pool.query(
    `
      DELETE FROM opportunity_list
      WHERE opportunity_id = $1
        OR raw_payload->>'id' = $1
        OR raw_payload->>'opportunityId' = $1
        OR raw_payload->>'opportunity_id' = $1
        OR raw_payload->'opportunity'->>'id' = $1
        OR raw_payload->'opportunity'->>'opportunityId' = $1
        OR raw_payload->'opportunity'->>'opportunity_id' = $1
        OR raw_payload->'data'->>'id' = $1
        OR raw_payload->'data'->>'opportunityId' = $1
        OR raw_payload->'data'->>'opportunity_id' = $1
        OR raw_payload->'data'->'opportunity'->>'id' = $1
        OR raw_payload->'data'->'opportunity'->>'opportunityId' = $1
        OR raw_payload->'data'->'opportunity'->>'opportunity_id' = $1
    `,
    [opportunityId]
  );

  return result.rowCount;
}

export async function markOpportunityDeleted(opportunityId, payload = {}) {
  await ensureOpportunityTable();

  await pool.query(
    `
      INSERT INTO opportunity_delete_log (opportunity_id, raw_payload, deleted_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (opportunity_id)
      DO UPDATE SET
        raw_payload = EXCLUDED.raw_payload,
        deleted_at = NOW()
    `,
    [opportunityId, payload]
  );
}

export async function listOpportunities({ limit = 100, offset = 0 } = {}) {
  await ensureOpportunityTable();

  const result = await pool.query(
    `
      SELECT
        opportunity_id,
        name,
        monetary_value,
        currency,
        pipeline_id,
        pipeline_stage_id,
        assigned_to,
        status,
        ghl_created_at,
        created_in_crm_on,
        contact_id,
        contact_tag,
        contact_email,
        contact_phone,
        TO_CHAR(forecast_expected_close_date, 'YYYY-MM-DD') AS forecast_expected_close_date,
        TO_CHAR(forecast_original_close_date, 'YYYY-MM-DD') AS forecast_original_close_date,
        updated_at
      FROM opportunity_list
      ORDER BY updated_at DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );

  return result.rows;
}
