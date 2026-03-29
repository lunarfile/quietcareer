-- QuietCareer Supabase Schema
-- All data is encrypted client-side before storage
-- RLS ensures users can only access their own data

-- User backup table — stores encrypted data blobs
CREATE TABLE IF NOT EXISTS user_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  encrypted_data TEXT NOT NULL,           -- AES-256-GCM encrypted JSON blob
  data_version INTEGER DEFAULT 1,         -- schema version for migrations
  record_count INTEGER DEFAULT 0,         -- total records (for integrity display)
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One backup per user (upsert pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_backups_user_id ON user_backups(user_id);

-- Enable RLS
ALTER TABLE user_backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can ONLY read/write their own data
CREATE POLICY "Users can read own backups"
  ON user_backups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backups"
  ON user_backups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backups"
  ON user_backups FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own backups"
  ON user_backups FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_backups_updated_at
  BEFORE UPDATE ON user_backups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Audit log — tracks sync events (optional, for debugging)
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,                   -- 'push', 'pull', 'restore'
  record_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sync logs"
  ON sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync logs"
  ON sync_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Rate limit: max 100 syncs per day per user (prevent abuse)
-- Enforced at application level, not DB level
