-- Shared trigger function: keeps updated_at current on any table.
-- Created once; subsequent migrations reference this function without recreating it.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- companies: one row per employer the user is tracking
CREATE TABLE IF NOT EXISTS companies (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  website    text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_own"
  ON companies FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "companies_insert_own"
  ON companies FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies_update_own"
  ON companies FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies_delete_own"
  ON companies FOR DELETE
  USING (user_id = auth.uid());
