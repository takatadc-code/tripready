#!/bin/bash
# ============================================
#  TripReady ワンクリック起動スクリプト
#  このファイルをダブルクリックするだけでOK！
# ============================================

clear
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║     TripReady - 起動中...            ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Google Drive のソースパス
SRC="/Users/humanz/Library/CloudStorage/GoogleDrive-takatadc@gmail.com/マイドライブ/TripReady"
DEST="$HOME/Desktop/TripReady"

# 0. 前回のExpoプロセスを停止
lsof -ti:8081 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:8082 2>/dev/null | xargs kill -9 2>/dev/null

# 1. コピー
echo "  [1/3] Google Drive → Desktop にコピー中..."
rm -rf "$DEST"
cp -R "$SRC" "$DEST"
echo "        完了!"
echo ""

# 2. npm install
echo "  [2/3] パッケージインストール中..."
cd "$DEST"
npm install --silent 2>&1 | tail -1
echo "        完了!"
echo ""

# 3. Expo 起動
echo "  [3/3] Expo 起動中... QRコードが表示されます"
echo ""
echo "  ────────────────────────────────────────"
echo "  iPhoneのカメラでQRを読み取ってください"
echo "  終了するには Ctrl+C を押してください"
echo "  ────────────────────────────────────────"
echo ""

npx expo start -c
