-- ============================================
-- TripReady: AI使用回数管理テーブル
-- Supabase SQL Editor で実行してください
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  feature TEXT NOT NULL,              -- 'airport_guide', 'insurance_consult', 'scan_ticket', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デバイスごとの課金状態
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  plan TEXT DEFAULT 'free',           -- 'free', 'premium', 'owner'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  receipt_data TEXT,                   -- App Store レシート（将来用）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_ai_usage" ON ai_usage FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);

-- インデックス（検索高速化）
CREATE INDEX IF NOT EXISTS idx_ai_usage_device ON ai_usage(device_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_device ON subscriptions(device_id);
