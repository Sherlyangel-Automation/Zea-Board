import { pool } from '../db/pool.js';

const tables = ['contacts_list', 'opportunity_list', 'invoice_list', 'user_list', 'contacts_8a9qkipdvii1uu2lm9v8', 'contacts', 'sub_accounts', 'zea_sub_accounts', 'zea_sync_events'];

async function inspectTables() {
  for (const table of tables) {
    const exists = await pool.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS exists
      `,
      [table]
    );

    if (!exists.rows[0].exists) {
      console.log(`${table}: does not exist`);
      continue;
    }

    const count = await pool.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    const columns = await pool.query(
      `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `,
      [table]
    );

    console.log(`\n${table}: ${count.rows[0].count} rows`);
    console.log(JSON.stringify(columns.rows, null, 2));
  }
}

inspectTables()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
