import { pool } from '../db/pool.js';

const defaultLayout = {
  backgroundColor: '#f8f5ff',
  backgroundImageUrl: '',
  columns: 12
};

function toJsonb(value, fallback) {
  return JSON.stringify(value ?? fallback);
}

export async function ensureDashboardTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS zea_dashboards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sub_account_id UUID NOT NULL REFERENCES zea_sub_accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      layout JSONB NOT NULL DEFAULT '{"backgroundColor":"#f8f5ff","backgroundImageUrl":"","columns":12}'::jsonb,
      widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_zea_dashboards_sub_account_id ON zea_dashboards(sub_account_id)');
}

function normalizeDashboard(row) {
  if (!row) return null;

  return {
    id: row.id,
    subAccountId: row.sub_account_id,
    subAccountName: row.sub_account_name,
    locationId: row.location_id,
    name: row.name,
    layout: { ...defaultLayout, ...(row.layout || {}) },
    widgets: Array.isArray(row.widgets) ? row.widgets : [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listDashboards() {
  await ensureDashboardTable();
  const result = await pool.query(`
    SELECT d.*, s.name AS sub_account_name, s.location_id
    FROM zea_dashboards d
    JOIN zea_sub_accounts s ON s.id = d.sub_account_id
    WHERE d.is_active = TRUE
    ORDER BY d.updated_at DESC
  `);
  return result.rows.map(normalizeDashboard);
}

export async function getDashboard(id) {
  await ensureDashboardTable();
  const result = await pool.query(
    `
      SELECT d.*, s.name AS sub_account_name, s.location_id
      FROM zea_dashboards d
      JOIN zea_sub_accounts s ON s.id = d.sub_account_id
      WHERE d.id = $1 AND d.is_active = TRUE
      LIMIT 1
    `,
    [id]
  );
  return normalizeDashboard(result.rows[0]);
}

export async function createDashboard({ subAccountId, name, layout = defaultLayout, widgets = [] }) {
  await ensureDashboardTable();
  const result = await pool.query(
    `
      INSERT INTO zea_dashboards (sub_account_id, name, layout, widgets)
      VALUES ($1, $2, $3::jsonb, $4::jsonb)
      RETURNING *
    `,
    [subAccountId, name, toJsonb({ ...defaultLayout, ...layout }, defaultLayout), toJsonb(widgets, [])]
  );
  return getDashboard(result.rows[0].id);
}

export async function updateDashboard(id, { name, layout, widgets }) {
  await ensureDashboardTable();
  const current = await getDashboard(id);
  if (!current) return null;

  const result = await pool.query(
    `
      UPDATE zea_dashboards
      SET name = $2,
          layout = $3::jsonb,
          widgets = $4::jsonb,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      name || current.name,
      toJsonb({ ...defaultLayout, ...(layout || current.layout || {}) }, defaultLayout),
      toJsonb(Array.isArray(widgets) ? widgets : current.widgets, [])
    ]
  );
  return getDashboard(result.rows[0].id);
}
