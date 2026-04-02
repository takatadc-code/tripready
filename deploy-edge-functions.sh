#!/bin/bash
# ============================================
# TripReady — Supabase Edge Functions デプロイスクリプト
# 先生のMacのターミナルで実行してください
# ============================================

set -e  # エラーで即停止

echo "🚀 TripReady Edge Functions デプロイを開始します"
echo "================================================"

# ===== 1. Supabase CLI の確認・インストール =====
if ! command -v supabase &> /dev/null; then
  echo "📦 Supabase CLI をインストール中..."
  brew install supabase/tap/supabase
  echo "✅ Supabase CLI インストール完了"
else
  echo "✅ Supabase CLI 検出: $(supabase --version)"
fi

# ===== 2. プロジェクトディレクトリに移動 =====
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
echo "📁 作業ディレクトリ: $(pwd)"

# ===== 3. Supabase ログイン =====
echo ""
echo "🔑 Supabase にログインします"
echo "   ブラウザが開くので、Supabaseアカウントでログインしてください"
supabase login

# ===== 4. プロジェクトをリンク =====
echo ""
echo "🔗 Supabase プロジェクトをリンク中..."
supabase link --project-ref avgkothltsztloywnurx
echo "✅ プロジェクトリンク完了"

# ===== 5. Anthropic API キーを設定 =====
echo ""
echo "🔐 Anthropic API キーを環境変数に設定します"
echo "   現在のキーを使用しますか？ (y/n)"
read -r USE_EXISTING

if [ "$USE_EXISTING" = "y" ] || [ "$USE_EXISTING" = "Y" ]; then
  supabase secrets set ANTHROPIC_API_KEY=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
else
  echo "   新しいAPIキーを入力してください:"
  read -r NEW_KEY
  supabase secrets set "ANTHROPIC_API_KEY=$NEW_KEY"
fi
echo "✅ API キー設定完了"

# ===== 6. ai-proxy をデプロイ =====
echo ""
echo "🚀 ai-proxy Edge Function をデプロイ中..."
supabase functions deploy ai-proxy --no-verify-jwt
echo "✅ ai-proxy デプロイ完了"

# ===== 7. fetch-mofa-safety をデプロイ =====
echo ""
echo "🚀 fetch-mofa-safety Edge Function をデプロイ中..."
supabase functions deploy fetch-mofa-safety --no-verify-jwt
echo "✅ fetch-mofa-safety デプロイ完了"

# ===== 8. DBテーブル作成（まだなければ） =====
echo ""
echo "📊 データベーステーブルを確認・作成します..."

# mofa_danger_levels テーブル
supabase db execute --sql "
CREATE TABLE IF NOT EXISTS mofa_danger_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT UNIQUE NOT NULL,
  mofa_country_code TEXT,
  country_name_ja TEXT NOT NULL,
  danger_level INTEGER DEFAULT 0,
  danger_level_text TEXT,
  region_info JSONB DEFAULT '[]',
  alerts JSONB DEFAULT '[]',
  spot_info TEXT DEFAULT '',
  source_url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
" 2>/dev/null || echo "   (テーブルは既に存在します)"

# ai_usage テーブル
supabase db execute --sql "
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  feature TEXT DEFAULT 'ai_proxy',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_device ON ai_usage(device_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);
" 2>/dev/null || echo "   (テーブルは既に存在します)"

# subscriptions テーブル
supabase db execute --sql "
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  receipt_data TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
" 2>/dev/null || echo "   (テーブルは既に存在します)"

echo "✅ データベース準備完了"

# ===== 9. 動作確認 =====
echo ""
echo "🧪 ai-proxy の動作確認..."
RESPONSE=$(curl -s -X POST \
  "https://avgkothltsztloywnurx.supabase.co/functions/v1/ai-proxy" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Z2tvdGhsdHN6dGxveXdudXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDM3NjYsImV4cCI6MjA4OTg3OTc2Nn0.wFVxLd6uiWM9K6Rbr5XR8sJz-KjLyLskw09_Z1Om280" \
  -H "Content-Type: application/json" \
  -H "x-device-id: deploy-test" \
  -d '{"model":"claude-haiku-4-5-20241022","max_tokens":50,"messages":[{"role":"user","content":"Say OK in Japanese"}],"device_id":"deploy-test","feature":"deploy_test"}')

if echo "$RESPONSE" | grep -q "content"; then
  echo "✅ ai-proxy 動作確認OK！"
  echo "   レスポンス: $RESPONSE" | head -c 200
else
  echo "⚠️  ai-proxy の応答を確認してください:"
  echo "   $RESPONSE" | head -c 500
fi

echo ""
echo "🧪 fetch-mofa-safety の動作確認（韓国のみ）..."
MOFA_RESPONSE=$(curl -s -X POST \
  "https://avgkothltsztloywnurx.supabase.co/functions/v1/fetch-mofa-safety?country=KR" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Z2tvdGhsdHN6dGxveXdudXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDM3NjYsImV4cCI6MjA4OTg3OTc2Nn0.wFVxLd6uiWM9K6Rbr5XR8sJz-KjLyLskw09_Z1Om280" \
  -H "Content-Type: application/json")

if echo "$MOFA_RESPONSE" | grep -q "success"; then
  echo "✅ fetch-mofa-safety 動作確認OK！"
  echo "   $MOFA_RESPONSE" | head -c 300
else
  echo "⚠️  fetch-mofa-safety の応答を確認してください:"
  echo "   $MOFA_RESPONSE" | head -c 500
fi

# ===== 完了 =====
echo ""
echo "================================================"
echo "🎉 デプロイ完了！"
echo ""
echo "デプロイされた Edge Functions:"
echo "  ✅ ai-proxy      — AIスキャン・保険相談・空港ガイド"
echo "  ✅ fetch-mofa-safety — 外務省安全情報の自動更新"
echo ""
echo "次のステップ:"
echo "  1. Expo Go でアプリを開き、AIスキャン機能を試す"
echo "  2. fetch-mofa-safety を定期実行するには:"
echo "     supabase functions schedule fetch-mofa-safety --cron '0 3 * * *'"
echo "     (毎日AM3時に全国の安全情報を更新)"
echo "================================================"
