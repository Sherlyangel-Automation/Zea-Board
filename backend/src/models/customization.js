import { pool } from '../db/pool.js';

const DEFAULT_CUSTOMIZATION = {
  appName: 'Zea Board',
  primaryColor: '#4B3F91',
  secondaryColor: '#22d3ee',
  accentColor: '#facc15',
  backgroundColor: '#f4f1ff',
  surfaceColor: '#ffffff',
  textColor: '#172033',
  fontFamily: '"Open Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  sidepanelFontFamily: '"Open Sans", ui-sans-serif, system-ui, sans-serif',
  columnFontFamily: '"Open Sans", ui-sans-serif, system-ui, sans-serif',
  backgroundImageUrl: '',
  colorPalette: ['#4B3F91', '#6B5CB8', '#22d3ee', '#f97316', '#facc15']
};

export async function ensureCustomizationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_customization (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      app_name TEXT NOT NULL DEFAULT 'Zea Board',
      primary_color TEXT NOT NULL DEFAULT '#4B3F91',
      secondary_color TEXT NOT NULL DEFAULT '#22d3ee',
      accent_color TEXT NOT NULL DEFAULT '#facc15',
      background_color TEXT NOT NULL DEFAULT '#f4f1ff',
      surface_color TEXT NOT NULL DEFAULT '#ffffff',
      text_color TEXT NOT NULL DEFAULT '#172033',
      font_family TEXT NOT NULL DEFAULT '"Open Sans", ui-sans-serif, system-ui, sans-serif',
      sidepanel_font_family TEXT NOT NULL DEFAULT '"Open Sans", ui-sans-serif, system-ui, sans-serif',
      column_font_family TEXT NOT NULL DEFAULT '"Open Sans", ui-sans-serif, system-ui, sans-serif',
      background_image_url TEXT NOT NULL DEFAULT '',
      color_palette JSONB NOT NULL DEFAULT '["#4B3F91", "#6B5CB8", "#22d3ee", "#f97316", "#facc15"]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE app_customization
      ADD COLUMN IF NOT EXISTS sidepanel_font_family TEXT NOT NULL DEFAULT '"Open Sans", ui-sans-serif, system-ui, sans-serif',
      ADD COLUMN IF NOT EXISTS column_font_family TEXT NOT NULL DEFAULT '"Open Sans", ui-sans-serif, system-ui, sans-serif'
  `);

  await pool.query(`
    INSERT INTO app_customization (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `);

  await pool.query(
    `
      UPDATE app_customization
      SET primary_color = $1,
          color_palette = $2::jsonb,
          updated_at = NOW()
      WHERE id = 1
        AND (
          primary_color IN ('#7c3aed', '#7C3AED')
          OR color_palette::text ILIKE '%#7c3aed%'
          OR color_palette::text ILIKE '%#a855f7%'
        )
    `,
    [DEFAULT_CUSTOMIZATION.primaryColor, JSON.stringify(DEFAULT_CUSTOMIZATION.colorPalette)]
  );


  await pool.query(
    `UPDATE app_customization
     SET font_family = $1,
         sidepanel_font_family = $2,
         column_font_family = $2,
         updated_at = NOW()
     WHERE id = 1
       AND (
         font_family IS DISTINCT FROM $1
         OR sidepanel_font_family IS DISTINCT FROM $2
         OR column_font_family IS DISTINCT FROM $2
       )`,
    [DEFAULT_CUSTOMIZATION.fontFamily, DEFAULT_CUSTOMIZATION.sidepanelFontFamily]
  );
}

function toCamel(row) {
  return {
    appName: row.app_name,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    backgroundColor: row.background_color,
    surfaceColor: row.surface_color,
    textColor: row.text_color,
    fontFamily: row.font_family,
    sidepanelFontFamily: row.sidepanel_font_family || DEFAULT_CUSTOMIZATION.sidepanelFontFamily,
    columnFontFamily: row.column_font_family || DEFAULT_CUSTOMIZATION.columnFontFamily,
    backgroundImageUrl: row.background_image_url,
    colorPalette: Array.isArray(row.color_palette) ? row.color_palette : DEFAULT_CUSTOMIZATION.colorPalette,
    updatedAt: row.updated_at
  };
}

export async function getCustomization() {
  await ensureCustomizationTable();

  const result = await pool.query('SELECT * FROM app_customization WHERE id = 1');
  return result.rows[0] ? toCamel(result.rows[0]) : DEFAULT_CUSTOMIZATION;
}

export async function updateCustomization(input = {}) {
  await ensureCustomizationTable();

  const current = await getCustomization();
  const next = {
    appName: input.appName || current.appName,
    primaryColor: input.primaryColor || current.primaryColor,
    secondaryColor: input.secondaryColor || current.secondaryColor,
    accentColor: input.accentColor || current.accentColor,
    backgroundColor: input.backgroundColor || current.backgroundColor,
    surfaceColor: input.surfaceColor || current.surfaceColor,
    textColor: input.textColor || current.textColor,
    fontFamily: input.fontFamily || current.fontFamily,
    sidepanelFontFamily: input.sidepanelFontFamily || current.sidepanelFontFamily,
    columnFontFamily: input.columnFontFamily || current.columnFontFamily,
    backgroundImageUrl: input.backgroundImageUrl ?? current.backgroundImageUrl,
    colorPalette: Array.isArray(input.colorPalette) && input.colorPalette.length ? input.colorPalette : current.colorPalette
  };

  const result = await pool.query(
    `
      INSERT INTO app_customization
        (id, app_name, primary_color, secondary_color, accent_color, background_color, surface_color, text_color, font_family, sidepanel_font_family, column_font_family, background_image_url, color_palette)
      VALUES
        (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id)
      DO UPDATE SET
        app_name = EXCLUDED.app_name,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        accent_color = EXCLUDED.accent_color,
        background_color = EXCLUDED.background_color,
        surface_color = EXCLUDED.surface_color,
        text_color = EXCLUDED.text_color,
        font_family = EXCLUDED.font_family,
        sidepanel_font_family = EXCLUDED.sidepanel_font_family,
        column_font_family = EXCLUDED.column_font_family,
        background_image_url = EXCLUDED.background_image_url,
        color_palette = EXCLUDED.color_palette,
        updated_at = NOW()
      RETURNING *
    `,
    [
      next.appName,
      next.primaryColor,
      next.secondaryColor,
      next.accentColor,
      next.backgroundColor,
      next.surfaceColor,
      next.textColor,
      next.fontFamily,
      next.sidepanelFontFamily,
      next.columnFontFamily,
      next.backgroundImageUrl,
      JSON.stringify(next.colorPalette)
    ]
  );

  return toCamel(result.rows[0]);
}

