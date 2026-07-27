import { pool } from '../db/pool.js';
import { ensureOpportunityTable } from '../models/opportunities.js';

async function inspectOpportunities() {
  await ensureOpportunityTable();

  const result = await pool.query(`
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
    LIMIT 20
  `);

  console.log(JSON.stringify(result.rows, null, 2));
}

inspectOpportunities()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
