-- =====================================================
-- TripReady: コアテーブル作成マイグレーション
-- Supabase SQL Editor で実行してください
-- =====================================================

-- 1. subscriptions（サブスクリプション管理）
-- デバイスごとのプラン情報を管理
CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id     TEXT NOT NULL UNIQUE,
  plan          TEXT NOT NULL DEFAULT 'free'
                CHECK (plan IN ('free', 'premium', 'owner')),
  expires_at    TIMESTAMPTZ,                  -- premium の有効期限（owner は NULL）
  receipt_data  TEXT,                          -- Apple IAP レシート（検証用）
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- device_id での高速検索用
CREATE INDEX IF NOT EXISTS idx_subscriptions_device_id ON subscriptions(device_id);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 2. ai_usage（AI利用履歴）
-- AI機能の使用回数を記録（プラン上限管理に使用）
CREATE TABLE IF NOT EXISTS ai_usage (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id     TEXT NOT NULL,
  feature       TEXT NOT NULL DEFAULT 'general',  -- scan_passport, scan_credit_card, night_safety_guide, etc.
  model         TEXT,                              -- 使用したモデル名
  tokens_in     INTEGER,                           -- 入力トークン数
  tokens_out    INTEGER,                           -- 出力トークン数
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- デバイス別の使用回数カウント用
CREATE INDEX IF NOT EXISTS idx_ai_usage_device_id ON ai_usage(device_id);
-- 月別集計用（今月の使用回数を高速取得）
CREATE INDEX IF NOT EXISTS idx_ai_usage_device_created ON ai_usage(device_id, created_at DESC);
-- feature 別の集計用
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage(feature);


-- 3. mofa_danger_levels（外務省 危険レベル情報）
-- fetch-mofa-safety Edge Function が upsert するテーブル
CREATE TABLE IF NOT EXISTS mofa_danger_levels (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code      TEXT NOT NULL UNIQUE,           -- ISO 3166-1 alpha-2 (JP, US, KR, ...)
  mofa_country_code TEXT,                            -- 外務省独自の国コード (0082, 0001, ...)
  country_name_ja   TEXT NOT NULL,                   -- 日本語国名
  danger_level      INTEGER DEFAULT 0               -- 0: 安全, 1: 注意, 2: 不要不急渡航中止, 3: 渡航中止勧告, 4: 退避勧告
                    CHECK (danger_level BETWEEN 0 AND 4),
  danger_level_text TEXT,                            -- "レベル1：十分注意してください" など
  region_info       JSONB DEFAULT '[]'::jsonb,      -- 地域別の危険情報 [{region, level, description}]
  alerts            JSONB DEFAULT '[]'::jsonb,      -- 感染症・テロ等の注意喚起
  spot_info         JSONB DEFAULT '[]'::jsonb,      -- スポット情報
  source_url        TEXT,                            -- 外務省の元データURL
  fetched_at        TIMESTAMPTZ DEFAULT now(),       -- 最終取得日時
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 国コードでの高速検索
CREATE INDEX IF NOT EXISTS idx_mofa_country_code ON mofa_danger_levels(country_code);
-- 危険レベルでのフィルタリング
CREATE INDEX IF NOT EXISTS idx_mofa_danger_level ON mofa_danger_levels(danger_level);

CREATE TRIGGER trg_mofa_updated_at
  BEFORE UPDATE ON mofa_danger_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- Row Level Security (RLS) ポリシー
-- =====================================================

-- subscriptions: anon キーでの読み書きを許可
-- （デバイスIDベースの認証なので、anon ロールで操作）
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read subscriptions"
  ON subscriptions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert subscriptions"
  ON subscriptions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update subscriptions"
  ON subscriptions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- service_role（Edge Function用）は全操作OK
CREATE POLICY "Allow service_role full access subscriptions"
  ON subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ai_usage: anon での読み取りと挿入を許可
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read ai_usage"
  ON ai_usage FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert ai_usage"
  ON ai_usage FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow service_role full access ai_usage"
  ON ai_usage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- mofa_danger_levels: anon で読み取り、service_role で書き込み
ALTER TABLE mofa_danger_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read mofa_danger_levels"
  ON mofa_danger_levels FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow service_role full access mofa_danger_levels"
  ON mofa_danger_levels FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- =====================================================
-- 完了メッセージ
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ TripReady コアテーブル作成完了: subscriptions, ai_usage, mofa_danger_levels';
END $$;
