import { pool } from '../db/pool.js';

async function cleanupTables() {
  await pool.query('DROP TABLE IF EXISTS contacts CASCADE');
  await pool.query('DROP TABLE IF EXISTS sub_accounts CASCADE');
  console.log('Dropped unused tables: contacts, sub_accounts');
}

cleanupTables()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
