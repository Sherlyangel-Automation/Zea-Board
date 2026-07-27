import { pool } from '../db/pool.js';
import { ensureOpportunityTable } from '../models/opportunities.js';

async function backfillOpportunities() {
  await ensureOpportunityTable();

  const datesResult = await pool.query(`
    UPDATE opportunity_list AS opportunity
    SET
      ghl_created_at = COALESCE(
        opportunity.ghl_created_at,
        NULLIF(opportunity.raw_payload->'opportunity'->>'createdAt', '')::timestamptz,
        NULLIF(opportunity.raw_payload->'opportunity'->>'dateAdded', '')::timestamptz,
        NULLIF(opportunity.raw_payload->>'createdAt', '')::timestamptz,
        NULLIF(opportunity.raw_payload->>'dateAdded', '')::timestamptz
      ),
      closing_date = COALESCE(
        opportunity.closing_date,
        NULLIF(opportunity.raw_payload->'opportunity'->>'forecastExpectedCloseDate', '')::timestamptz,
        NULLIF(opportunity.raw_payload->>'forecastExpectedCloseDate', '')::timestamptz,
        NULLIF(opportunity.raw_payload->'opportunity'->>'closingDate', '')::timestamptz,
        NULLIF(opportunity.raw_payload->'opportunity'->>'closeDate', '')::timestamptz,
        NULLIF(opportunity.raw_payload->'opportunity'->>'dateOfClose', '')::timestamptz,
        NULLIF(opportunity.raw_payload->>'closingDate', '')::timestamptz,
        NULLIF(opportunity.raw_payload->>'closeDate', '')::timestamptz,
        NULLIF(opportunity.raw_payload->>'dateOfClose', '')::timestamptz
      ),
      forecast_expected_close_date = COALESCE(
        opportunity.forecast_expected_close_date,
        NULLIF(opportunity.raw_payload->'opportunity'->>'forecastExpectedCloseDate', '')::date,
        NULLIF(opportunity.raw_payload->>'forecastExpectedCloseDate', '')::date
      ),
      forecast_original_close_date = COALESCE(
        opportunity.forecast_original_close_date,
        NULLIF(opportunity.raw_payload->'opportunity'->>'forecastOriginalCloseDate', '')::date,
        NULLIF(opportunity.raw_payload->>'forecastOriginalCloseDate', '')::date
      ),
      updated_at = NOW()
    RETURNING opportunity.opportunity_id
  `);

  const contactResult = await pool.query(`
    UPDATE opportunity_list AS opportunity
    SET
      contact_tag = COALESCE(opportunity.contact_tag, contact.tag),
      contact_email = COALESCE(opportunity.contact_email, contact.email),
      contact_phone = COALESCE(opportunity.contact_phone, contact.phone_number),
      updated_at = NOW()
    FROM contacts_list AS contact
    WHERE contact.contact_id = opportunity.contact_id
    RETURNING opportunity.opportunity_id
  `);

  console.log(`Backfilled dates for ${datesResult.rowCount} opportunity rows`);
  console.log(`Backfilled contact details for ${contactResult.rowCount} opportunity rows`);
}

backfillOpportunities()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
