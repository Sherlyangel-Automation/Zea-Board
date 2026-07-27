import { pool } from '../db/pool.js';

const oldTableName = 'contacts_8a9qkipdvii1uu2lm9v8';
const newTableName = 'contacts_list';

async function tableExists(tableName) {
  const result = await pool.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `,
    [tableName]
  );

  return result.rows[0].exists;
}

async function renameContactsTable() {
  const oldExists = await tableExists(oldTableName);
  const newExists = await tableExists(newTableName);

  if (oldExists && !newExists) {
    await pool.query(`ALTER TABLE "${oldTableName}" RENAME TO "${newTableName}"`);
    console.log(`Renamed ${oldTableName} to ${newTableName}`);
  } else if (newExists) {
    console.log(`${newTableName} already exists`);
  } else {
    throw new Error(`${oldTableName} does not exist`);
  }

  await pool.query(
    `
      UPDATE zea_sub_accounts
      SET contacts_table_name = $1, updated_at = NOW()
      WHERE contacts_table_name = $2 OR location_id = $3
    `,
    [newTableName, oldTableName, '8A9qkipDvII1uU2LM9v8']
  );

  console.log('Updated zea_sub_accounts.contacts_table_name');
}

renameContactsTable()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
