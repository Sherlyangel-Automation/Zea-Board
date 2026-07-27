import { pool } from '../db/pool.js';
import { quoteIdentifier } from '../utils/tableNames.js';

async function backfillContacts() {
  const subAccounts = await pool.query(`
    SELECT name, location_id, contacts_table_name
    FROM zea_sub_accounts
    ORDER BY created_at DESC
  `);

  for (const subAccount of subAccounts.rows) {
    const tableName = quoteIdentifier(subAccount.contacts_table_name);

    await pool.query(`
      ALTER TABLE ${tableName}
        ADD COLUMN IF NOT EXISTS sub_account_id TEXT,
        ADD COLUMN IF NOT EXISTS sub_account_name TEXT,
        ADD COLUMN IF NOT EXISTS source TEXT
    `);

    await pool.query(
      `
        UPDATE ${tableName}
        SET
          sub_account_id = COALESCE(sub_account_id, $1),
          sub_account_name = COALESCE(sub_account_name, $2)
      `,
      [subAccount.location_id, subAccount.name]
    );

    console.log(`Backfilled ${subAccount.contacts_table_name}`);
  }
}

backfillContacts()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
