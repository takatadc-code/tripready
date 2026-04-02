#!/usr/bin/env python3
"""
TripReady 画像アセット自動生成スクリプト
========================================
OpenAI DALL-E 3 API を使用してアプリの画像アセットを一括生成します。
マスコットキャラ「AERO CLOUD」を中心にしたデザインです。

使い方:
  1. ターミナルを開く
  2. 以下をコピペして実行:

     pip3 install openai
     cd ~/Desktop/TripReady
     python3 generate_images.py

  3. assets/generated/ フォルダに画像が保存されます
"""

import openai
import base64
import os
import sys
import time

# ===== OpenAI APIキー =====
API_KEY = "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"

# ===== 出力先 =====
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "assets", "generated")
os.makedirs(OUT_DIR, exist_ok=True)

client = openai.OpenAI(api_key=API_KEY)

# ===== マスコットキャラの共通説明 =====
MASCOT_DESC = """The character is a cute, round, puffy cloud-like mascot creature called "Aero Cloud". Key features:
- Round, soft, plush body shaped like a fluffy cloud, colored in very pale sky blue and white
- Wears brown leather aviator/pilot goggles on top of its head with blue circular lenses
- Has small cute wings on its back, same pale blue color as its body
- Short stubby arms and legs, pale blue
- Cute round black dot eyes, pink blush circles on cheeks
- A vertical dashed stitch line running down the center of its body (like a stuffed toy seam)
- Overall style: kawaii Japanese character design, similar to Sumikko Gurashi or San-X style
- The character should look exactly consistent across all images"""

# ===== 生成する画像の定義 =====
IMAGES = [
    # ----- アプリアイコン（3パターン） -----
    {
        "name": "icon_face",
        "size": "1024x1024",
        "quality": "hd",
        "desc": "アイコン案1: キャラ正面顔アップ",
        "prompt": f"""Design a mobile app icon (1024x1024, square).
{MASCOT_DESC}
Composition: Close-up of the character's face and upper body, centered, looking directly at the viewer with a warm smile. The aviator goggles are prominently visible on top. Background: clean sky blue (#0EA5E9) to teal (#14B8A6) gradient. No text, no letters. The character fills about 80% of the icon space. Must be recognizable even at 29x29 pixel size. Kawaii style, clean lines, vibrant but soft colors.""",
    },
    {
        "name": "icon_with_globe",
        "size": "1024x1024",
        "quality": "hd",
        "desc": "アイコン案2: キャラ＋小さな地球儀",
        "prompt": f"""Design a mobile app icon (1024x1024, square).
{MASCOT_DESC}
Composition: The character is shown from chest up, holding a small stylized globe in its hands. Aviator goggles on head. Cheerful expression. Background: soft white to pale sky blue gradient. No text, no letters. Clean, simple, cute. Must be recognizable at small sizes. Kawaii Japanese character design style.""",
    },
    {
        "name": "icon_flying",
        "size": "1024x1024",
        "quality": "hd",
        "desc": "アイコン案3: 飛んでるキャラ",
        "prompt": f"""Design a mobile app icon (1024x1024, square).
{MASCOT_DESC}
Composition: The character is flying/floating joyfully with its small wings spread, seen from a slight angle. Aviator goggles pulled down over its eyes like a pilot. A tiny contrail or sparkle trail behind it. Background: bright sky blue gradient with a few tiny white clouds. No text, no letters. Dynamic but cute pose. Must be recognizable at 29x29 pixels. Kawaii style.""",
    },

    # ----- スプラッシュスクリーン -----
    {
        "name": "splash_screen",
        "size": "1024x1792",
        "quality": "hd",
        "desc": "スプラッシュスクリーン（起動画面）",
        "prompt": f"""Design a mobile app splash/loading screen (portrait orientation).
{MASCOT_DESC}
Composition: The character is centered in the upper-middle portion of the screen, floating gently with wings slightly spread, holding a folded world map. Below the character, the text "TripReady" in a clean modern sans-serif font (dark gray #1F2937). Below that, a small Japanese tagline. Background: clean white with very subtle, faint line-art of world landmarks (Tokyo Tower, Eiffel Tower, Statue of Liberty) as barely visible watermarks at 5% opacity. A few tiny sparkles around the character. Overall feel: premium, clean, calm, kawaii but professional. Lots of whitespace.""",
    },

    # ----- アプリ内背景画像 -----
    {
        "name": "bg_home",
        "size": "1024x1792",
        "quality": "standard",
        "desc": "ホーム画面背景（淡いテクスチャ＋小さなキャラ）",
        "prompt": f"""Create a subtle mobile app background image (portrait).
{MASCOT_DESC}
Composition: Very soft, muted abstract background with gentle flowing clouds and pale sky blue (#F0F9FF) watercolor texture. In the bottom-right corner, a tiny (about 10% of image height) version of the mascot character is peeking in, partially hidden, as a cute subtle detail. The background must be extremely light so that UI text and cards remain readable. No heavy elements. Pale, dreamy, minimal. The character is just a small accent, not the focus.""",
    },
    {
        "name": "bg_trip_header",
        "size": "1792x1024",
        "quality": "hd",
        "desc": "旅行詳細画面ヘッダー（雲上のキャラ）",
        "prompt": f"""Design a wide banner image (landscape orientation).
{MASCOT_DESC}
Composition: A beautiful dreamy aerial view of fluffy clouds at golden hour. The mascot character sits happily on top of one of the clouds in the right portion of the image, small and cute, looking out at the sunset. Warm golden sunlight from the left. The bottom 30% fades smoothly to pure white via gradient. The character is small (about 15% of image width) - the clouds and sky are the main visual. Serene, aspirational, premium. Slightly desaturated for elegance.""",
    },

    # ----- Empty State イラスト -----
    {
        "name": "empty_state",
        "size": "1024x1024",
        "quality": "hd",
        "desc": "旅行未登録時のイラスト",
        "prompt": f"""Create a cute illustration for an empty state screen in a travel app.
{MASCOT_DESC}
Composition: The character is standing in the center, holding an unfolded world map upside down with a slightly confused/curious expression (head tilted, question mark floating nearby). A dotted line path on the ground leads from the character toward a horizon with tiny silhouettes of world landmarks. Small sparkles or stars suggest adventure awaits. Colors: Sky blue (#0EA5E9) and teal (#14B8A6) as accents, light gray for supporting elements. White background. Kawaii style, friendly and inviting. No text in the image.""",
    },

    # ----- キャラの各種ポーズ（アプリ内で使い回し用） -----
    {
        "name": "mascot_greeting",
        "size": "1024x1024",
        "quality": "hd",
        "desc": "キャラ：手を振る挨拶ポーズ",
        "prompt": f"""Character illustration on transparent/white background.
{MASCOT_DESC}
Pose: The character is waving one hand in a friendly greeting, smiling warmly. Full body visible, centered. Simple white or very light background. Clean kawaii illustration style with soft shading. No text. High quality, suitable for use as a sticker or in-app illustration.""",
    },
    {
        "name": "mascot_thinking",
        "size": "1024x1024",
        "quality": "hd",
        "desc": "キャラ：考え中ポーズ（ローディング用）",
        "prompt": f"""Character illustration on transparent/white background.
{MASCOT_DESC}
Pose: The character has one hand on its chin in a thinking pose, looking upward. Small thought bubbles or dots floating above its head. Curious, pondering expression. Full body visible, centered. Simple white background. Clean kawaii illustration style. No text. Suitable for use as a loading/processing indicator in an app.""",
    },
    {
        "name": "mascot_celebrate",
        "size": "1024x1024",
        "quality": "hd",
        "desc": "キャラ：お祝いポーズ（完了画面用）",
        "prompt": f"""Character illustration on transparent/white background.
{MASCOT_DESC}
Pose: The character is jumping with joy, both arms raised in celebration. Small confetti, sparkles, or star effects around it. Very happy expression with closed-eye smile. Full body visible, centered. Simple white background. Clean kawaii illustration style. No text. Suitable for use as a success/completion screen in an app.""",
    },
    {
        "name": "mascot_passport",
        "size": "1024x1024",
        "quality": "hd",
        "desc": "キャラ：パスポートを持つポーズ",
        "prompt": f"""Character illustration on transparent/white background.
{MASCOT_DESC}
Pose: The character is proudly holding up a small passport (dark blue/red booklet) with one hand, looking confident and ready for travel. Aviator goggles gleaming. Full body visible, centered. Simple white background. Clean kawaii illustration style. No text. Suitable for in-app illustration.""",
    },
    {
        "name": "mascot_suitcase",
        "size": "1024x1024",
        "quality": "hd",
        "desc": "キャラ：スーツケースと一緒",
        "prompt": f"""Character illustration on transparent/white background.
{MASCOT_DESC}
Pose: The character stands next to a small cute suitcase/travel bag (sky blue color matching the character). One hand rests on top of the suitcase. Ready-to-travel expression, looking cheerful and prepared. Full body visible, centered. Simple white background. Clean kawaii illustration style. No text.""",
    },

    # ----- 各国ヘッダー画像（キャラ入り） -----
    {
        "name": "country_japan",
        "size": "1792x1024",
        "quality": "standard",
        "desc": "日本ヘッダー画像",
        "prompt": f"""Artistic travel header image, watercolor style, muted and elegant. Japan themed.
{MASCOT_DESC}
Scene: Cherry blossoms and Tokyo Tower as soft silhouette in the background. The small mascot character (about 12% of image width) sits in the bottom-right corner under a cherry blossom tree, looking up at falling petals. Bottom 20% fades to white. Soft pink and white palette. Dreamy, premium atmosphere.""",
    },
    {
        "name": "country_usa",
        "size": "1792x1024",
        "quality": "standard",
        "desc": "アメリカヘッダー画像",
        "prompt": f"""Artistic travel header image, watercolor style, muted and elegant. USA themed.
{MASCOT_DESC}
Scene: New York skyline silhouette with Statue of Liberty in soft background. The small mascot character (about 12% of image width) stands in bottom-right, holding a tiny American flag, looking at the skyline. Bottom 20% fades to white. Soft blue and warm orange sunset tones. Dreamy atmosphere.""",
    },
    {
        "name": "country_france",
        "size": "1792x1024",
        "quality": "standard",
        "desc": "フランスヘッダー画像",
        "prompt": f"""Artistic travel header image, watercolor style, muted and elegant. France themed.
{MASCOT_DESC}
Scene: Eiffel Tower silhouette in misty morning background. The small mascot character (about 12% of image width) sits in bottom-right with a tiny beret on top of its goggles, holding a small croissant. Bottom 20% fades to white. Soft lavender and gray palette. Dreamy, charming atmosphere.""",
    },
    {
        "name": "country_singapore",
        "size": "1792x1024",
        "quality": "standard",
        "desc": "シンガポールヘッダー画像",
        "prompt": f"""Artistic travel header image, watercolor style, muted and elegant. Singapore themed.
{MASCOT_DESC}
Scene: Marina Bay Sands silhouette at warm twilight in background. The small mascot character (about 12% of image width) floats in bottom-right, looking at the city lights with wonder. Bottom 20% fades to white. Warm twilight purple and gold tones. Dreamy atmosphere.""",
    },
    {
        "name": "country_indonesia",
        "size": "1792x1024",
        "quality": "standard",
        "desc": "インドネシアヘッダー画像",
        "prompt": f"""Artistic travel header image, watercolor style, muted and elegant. Indonesia Bali themed.
{MASCOT_DESC}
Scene: Balinese temple gate (split gate / candi bentar) silhouette with tropical sunset in background. The small mascot character (about 12% of image width) stands in bottom-right, wearing a tiny flower lei, looking at the temple. Bottom 20% fades to white. Soft green and gold palette. Tropical dreamy atmosphere.""",
    },
    {
        "name": "country_korea",
        "size": "1792x1024",
        "quality": "standard",
        "desc": "韓国ヘッダー画像",
        "prompt": f"""Artistic travel header image, watercolor style, muted and elegant. South Korea themed.
{MASCOT_DESC}
Scene: Gyeongbokgung Palace silhouette in soft background. The small mascot character (about 12% of image width) stands in bottom-right, looking at the palace. Autumn maple leaves floating gently. Bottom 20% fades to white. Soft pink and sky blue palette. Serene dreamy atmosphere.""",
    },
    {
        "name": "country_thailand",
        "size": "1792x1024",
        "quality": "standard",
        "desc": "タイヘッダー画像",
        "prompt": f"""Artistic travel header image, watercolor style, muted and elegant. Thailand themed.
{MASCOT_DESC}
Scene: Golden temple spires and pagoda silhouette in background. The small mascot character (about 12% of image width) floats in bottom-right with palms pressed together in a Thai wai greeting. Bottom 20% fades to white. Warm gold and deep blue palette. Dreamy spiritual atmosphere.""",
    },
    {
        "name": "country_australia",
        "size": "1792x1024",
        "quality": "standard",
        "desc": "オーストラリアヘッダー画像",
        "prompt": f"""Artistic travel header image, watercolor style, muted and elegant. Australia themed.
{MASCOT_DESC}
Scene: Sydney Opera House silhouette with harbour bridge in soft background. The small mascot character (about 12% of image width) sits in bottom-right on a small surfboard, looking at the harbour. Bottom 20% fades to white. Bright blue and warm sand tones. Sunny dreamy atmosphere.""",
    },
]


def generate_image(item):
    """1枚の画像を生成して保存"""
    path = os.path.join(OUT_DIR, f"{item['name']}.png")
    if os.path.exists(path):
        print(f"  [SKIP] {item['name']} - 既に生成済み")
        return True

    try:
        resp = client.images.generate(
            model="dall-e-3",
            prompt=item["prompt"],
            n=1,
            size=item["size"],
            response_format="b64_json",
            quality=item["quality"],
        )
        img_data = base64.b64decode(resp.data[0].b64_json)
        with open(path, "wb") as f:
            f.write(img_data)
        print(f"  [OK] {item['name']}.png ({len(img_data)//1024}KB)")
        return True
    except Exception as e:
        print(f"  [ERROR] {item['name']}: {e}")
        return False


def main():
    print("=" * 60)
    print("  TripReady 画像アセット自動生成")
    print("  マスコット「AERO CLOUD」入りデザイン")
    print("  DALL-E 3 API を使用")
    print(f"  保存先: {OUT_DIR}")
    print("=" * 60)
    print()

    total = len(IMAGES)
    success = 0
    fail = 0

    for i, item in enumerate(IMAGES, 1):
        print(f"[{i}/{total}] {item['desc']}")
        if generate_image(item):
            success += 1
        else:
            fail += 1

        # API レート制限対策（DALL-E 3は1分5枚まで）
        if i < total:
            print("  ... 15秒待機（レート制限対策）...")
            time.sleep(15)

    print()
    print("=" * 60)
    print(f"  完了！ 成功: {success} / 失敗: {fail} / 合計: {total}")
    print(f"  保存先: {OUT_DIR}")
    print("=" * 60)

    if fail > 0:
        print("\n失敗した画像は、もう一度このスクリプトを実行すれば")
        print("スキップせずに再生成されます。")


if __name__ == "__main__":
    main()
