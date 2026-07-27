import { pool } from '../db/pool.js';
import { ensureUserTable } from '../models/users.js';

async function inspectUsers() {
  await ensureUserTable();

  const result = await pool.query(`
    SELECT user_id AS id, name, email, phone, extension, user_type, role, updated_at
    FROM user_list
    ORDER BY updated_at DESC
    LIMIT 20
  `);

  console.log(JSON.stringify(result.rows, null, 2));
}

inspectUsers()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
