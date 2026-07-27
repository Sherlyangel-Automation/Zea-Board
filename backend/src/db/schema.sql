CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS zea_sub_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_id TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  contacts_table_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zea_sync_events (
  id BIGSERIAL PRIMARY KEY,
  sub_account_id UUID REFERENCES zea_sub_accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  contact_id TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zea_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id UUID NOT NULL REFERENCES zea_sub_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout JSONB NOT NULL DEFAULT '{"backgroundColor":"#f8f5ff","backgroundImageUrl":"","columns":12}'::jsonb,
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zea_dashboards_sub_account_id ON zea_dashboards(sub_account_id);
