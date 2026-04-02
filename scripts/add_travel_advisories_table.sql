-- ============================================
-- TripReady: 渡航安全情報テーブル
-- 外務省オープンデータ + 手動オーバーライド対応
-- Supabase SQL Editor で実行してください
-- ============================================

-- 外務省の危険レベル情報（自動更新）
CREATE TABLE IF NOT EXISTS mofa_danger_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,             -- ISO 3166-1 alpha-2 (JP, KR, IR, US...)
  mofa_country_code TEXT,                 -- 外務省独自の国コード (0082, 0098, 0001...)
  country_name_ja TEXT NOT NULL,          -- 日本語の国名
  danger_level INTEGER NOT NULL DEFAULT 0, -- 0=情報なし, 1=十分注意, 2=不要不急の渡航中止, 3=渡航中止勧告, 4=退避勧告
  danger_level_text TEXT,                 -- レベルの説明テキスト
  region_info JSONB,                      -- 地域別の危険レベル [{ region: "テヘラン", level: 4, text: "..." }, ...]
  alerts TEXT[],                          -- 注意喚起テキスト配列
  spot_info TEXT,                         -- スポット情報（最新の要約）
  source_url TEXT,                        -- 外務省の情報ページURL
  fetched_at TIMESTAMPTZ DEFAULT NOW(),   -- データ取得日時
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 入国要件のオーバーライドテーブル（手動更新）
-- アプリ内ハードコードデータを上書きするためのテーブル
CREATE TABLE IF NOT EXISTS travel_requirement_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,       -- ISO 3166-1 alpha-2
  visa_free BOOLEAN,                       -- ビザなし入国可能か
  stay_days INTEGER,                       -- ビザなし滞在日数
  required_apps JSONB,                     -- 必要なアプリ/申請 [{ name, purpose, timing, url, isApp }]
  alerts TEXT[],                           -- 注意喚起テキスト（上書き）
  tips TEXT[],                             -- 旅行のヒント（上書き）
  plug_type TEXT,                          -- プラグタイプ
  voltage TEXT,                            -- 電圧
  notes TEXT,                              -- 管理メモ
  is_active BOOLEAN DEFAULT TRUE,          -- 有効/無効フラグ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE mofa_danger_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_requirement_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_mofa_danger" ON mofa_danger_levels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_travel_overrides" ON travel_requirement_overrides FOR ALL USING (true) WITH CHECK (true);

-- インデックス
CREATE UNIQUE INDEX IF NOT EXISTS idx_mofa_danger_country ON mofa_danger_levels(country_code);
CREATE INDEX IF NOT EXISTS idx_mofa_danger_level ON mofa_danger_levels(danger_level);
CREATE INDEX IF NOT EXISTS idx_travel_overrides_country ON travel_requirement_overrides(country_code);
