/*
# Create scans table (single-tenant, no auth)

1. New Tables
- `scans`
- `id` (uuid, primary key)
- `device_name` (text, name of detected device)
- `confidence` (numeric, device confidence percentage)
- `recovery_score` (integer, 0-100 recovery potential score)
- `component_reuse` (integer, component reuse percentage)
- `material_recovery` (integer, material recovery percentage)
- `image_url` (text, optional stored/preview image url)
- `components` (jsonb, list of detected components with confidence)
- `materials` (jsonb, material breakdown categories)
- `workflow` (jsonb, suggested recovery steps)
- `created_at` (timestamptz, default now)
2. Security
- Enable RLS on `scans`.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (no sign-in app).
*/

CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  recovery_score integer NOT NULL DEFAULT 0,
  component_reuse integer NOT NULL DEFAULT 0,
  material_recovery integer NOT NULL DEFAULT 0,
  image_url text,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  workflow jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scans" ON scans;
CREATE POLICY "anon_select_scans" ON scans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scans" ON scans;
CREATE POLICY "anon_insert_scans" ON scans FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scans" ON scans;
CREATE POLICY "anon_update_scans" ON scans FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scans" ON scans;
CREATE POLICY "anon_delete_scans" ON scans FOR DELETE
  TO anon, authenticated USING (true);