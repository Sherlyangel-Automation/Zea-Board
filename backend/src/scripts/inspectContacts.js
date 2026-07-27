import { pool } from '../db/pool.js';
import { quoteIdentifier } from '../utils/tableNames.js';

async function inspectContacts() {
  const subAccounts = await pool.query(`
    SELECT id, name, location_id, contacts_table_name, last_synced_at
    FROM zea_sub_accounts
    ORDER BY created_at DESC
  `);

  console.log(JSON.stringify(subAccounts.rows, null, 2));

  for (const subAccount of subAccounts.rows) {
    const contacts = await pool.query(`
      SELECT contact_id, sub_account_id, sub_account_name, name, email, phone_number, tag, timezone, medium, source, assigned_user, user_id, leadgen_owner, created_in_crm_on, created_at, updated_at
      FROM ${quoteIdentifier(subAccount.contacts_table_name)}
      ORDER BY updated_at DESC
      LIMIT 10
    `);

    console.log(`\n${subAccount.contacts_table_name}`);
    console.log(JSON.stringify(contacts.rows, null, 2));
  }
}

inspectContacts()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
