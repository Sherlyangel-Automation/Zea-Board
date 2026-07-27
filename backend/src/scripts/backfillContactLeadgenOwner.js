import { pool } from '../db/pool.js';
import { normalizeContact } from '../models/contacts.js';
import { quoteIdentifier } from '../utils/tableNames.js';

async function backfillContactLeadgenOwner() {
  const subAccounts = await pool.query(`
    SELECT contacts_table_name
    FROM zea_sub_accounts
    ORDER BY created_at DESC
  `);

  let updated = 0;

  for (const subAccount of subAccounts.rows) {
    const tableName = quoteIdentifier(subAccount.contacts_table_name);

    await pool.query(`
      ALTER TABLE ${tableName}
        ADD COLUMN IF NOT EXISTS leadgen_owner TEXT
    `);

    const contacts = await pool.query(`
      SELECT contact_id, raw_payload
      FROM ${tableName}
      WHERE raw_payload IS NOT NULL
    `);

    for (const contact of contacts.rows) {
      const normalized = normalizeContact(contact.raw_payload);

      if (!normalized.leadgenOwner) {
        continue;
      }

      await pool.query(
        `
          UPDATE ${tableName}
          SET leadgen_owner = $2
          WHERE contact_id = $1
        `,
        [contact.contact_id, normalized.leadgenOwner]
      );

      updated += 1;
    }
  }

  console.log(`Backfilled contact LeadGen Owner values: ${updated}`);
}

backfillContactLeadgenOwner()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
