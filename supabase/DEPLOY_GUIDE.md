# Supabase Edge Function デプロイガイド

## 概要
Anthropic APIキーをクライアントアプリから除去し、
Supabase Edge Function (`ai-proxy`) 経由でAI機能を利用する構成に変更しました。

## デプロイ手順

### 1. Supabase CLI のインストール（初回のみ）
```bash
brew install supabase/tap/supabase
```

### 2. Supabase プロジェクトにログイン
```bash
supabase login
```
ブラウザが開くのでSupabaseアカウントでログイン。

### 3. プロジェクトをリンク
```bash
cd ~/Desktop/TripReady
supabase link --project-ref avgkothltsztloywnurx
```

### 4. APIキーを環境変数（Secret）として登録
```bash
supabase secrets set ANTHROPIC_API_KEY=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
```

### 5. Edge Function をデプロイ
```bash
supabase functions deploy ai-proxy --no-verify-jwt
```
※ `--no-verify-jwt` はアプリからSupabase Anon Keyで呼べるようにするため。
  本番運用時はJWT検証を有効にしてRLSと組み合わせることを推奨。

### 6. 動作確認
```bash
curl -X POST \
  https://avgkothltsztloywnurx.supabase.co/functions/v1/ai-proxy \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Z2tvdGhsdHN6dGxveXdudXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDM3NjYsImV4cCI6MjA4OTg3OTc2Nn0.wFVxLd6uiWM9K6Rbr5XR8sJz-KjLyLskw09_Z1Om280" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":100,"messages":[{"role":"user","content":"Hello!"}]}'
```

レスポンスにClaudeの返答が含まれていれば成功。

## 変更したファイル

| ファイル | 変更内容 |
|---------|---------|
| `lib/scan-ticket.ts` | Anthropic API直接呼び出し → `supabase.functions.invoke('ai-proxy')` に変更 |
| `lib/config.ts` | APIキーを削除（空ファイルに） |
| `supabase/functions/ai-proxy/index.ts` | 新規作成（Edge Function本体） |

## 注意事項
- Edge Functionデプロイ前はAI機能（スキャン、保険相談、空港ガイド）が動作しません
- デプロイ後、アプリの再ビルドは不要（APIエンドポイントはSupabase SDK経由で自動解決）
- APIキーの変更はSupabase Secretsから行えます（アプリの再デプロイ不要）
