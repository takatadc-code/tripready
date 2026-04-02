-- ============================================
-- TripReady: 家族メンバー管理テーブル追加
-- Supabase SQL Editor で実行してください
-- ============================================

-- 1. travelers テーブル（家族メンバー）
CREATE TABLE IF NOT EXISTS travelers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,                    -- 氏名（ローマ字）
  full_name_jp TEXT,                          -- 氏名（日本語）
  relationship TEXT DEFAULT '本人',            -- 続柄（本人/配偶者/子供/その他）
  passport_number TEXT,                       -- パスポート番号
  passport_expiry TEXT,                       -- パスポート有効期限
  birth_date TEXT,                            -- 生年月日
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. traveler_mileage テーブル（メンバーごとのマイレージ）
CREATE TABLE IF NOT EXISTS traveler_mileage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  traveler_id UUID REFERENCES travelers(id) ON DELETE CASCADE,
  airline TEXT NOT NULL,                       -- 航空会社コード (NH, JL, KE, OZ, etc.)
  member_number TEXT NOT NULL,                 -- 会員番号
  status TEXT,                                 -- SFC, JGC, Gold, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. flight_passengers テーブル（フライトごとの搭乗者）
CREATE TABLE IF NOT EXISTS flight_passengers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flight_id UUID REFERENCES flights(id) ON DELETE CASCADE,
  traveler_id UUID REFERENCES travelers(id) ON DELETE CASCADE,
  seat TEXT,                                   -- 座席番号
  mileage_number TEXT,                         -- このフライトで使うマイレージ番号
  notes TEXT,
  UNIQUE(flight_id, traveler_id)
);

-- 4. hotels テーブルに列追加（既存テーブル）
DO $$ BEGIN
  ALTER TABLE hotels ADD COLUMN IF NOT EXISTS loyalty_program TEXT;
  ALTER TABLE hotels ADD COLUMN IF NOT EXISTS checkin_time TEXT;
  ALTER TABLE hotels ADD COLUMN IF NOT EXISTS checkout_time TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. RLS ポリシー（パブリックアクセス）
ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE traveler_mileage ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_passengers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_travelers" ON travelers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_traveler_mileage" ON traveler_mileage FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_flight_passengers" ON flight_passengers FOR ALL USING (true) WITH CHECK (true);
