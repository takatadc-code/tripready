#!/usr/bin/env python3
"""
TripReady — 国別ヘッダー画像生成スクリプト
DALL-E 3 API で 30+ カ国のヘッダー画像を一括生成します。
既存画像はスキップするので、途中で止めても再実行可能。

使い方（openaiライブラリ不要、requestsのみ）:
  cd TripReady
  python scripts/generate_country_headers.py
"""

import os
import sys
import time
import json
import requests

# ─── 設定 ───────────────────────────────────────────────
API_KEY = "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"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "generated")
SIZE = "1792x1024"
QUALITY = "standard"
API_URL = "https://api.openai.com/v1/images/generations"

# ─── 国リスト（コード, ファイル名キー, プロンプト用国名, ランドマーク/テーマ） ──
COUNTRIES = [
    # 既存 8 カ国（ファイルが既にあるのでスキップされる）
    ("JP", "japan",       "Japan",          "Mount Fuji, cherry blossoms, traditional torii gate, Tokyo skyline"),
    ("US", "usa",         "United States",  "Statue of Liberty, Golden Gate Bridge, Manhattan skyline"),
    ("FR", "france",      "France",         "Eiffel Tower, lavender fields of Provence, Parisian streetscape"),
    ("SG", "singapore",   "Singapore",      "Marina Bay Sands, Merlion, Gardens by the Bay supertrees"),
    ("ID", "indonesia",   "Indonesia",      "Bali rice terraces, Borobudur temple, tropical beach"),
    ("KR", "korea",       "South Korea",    "Gyeongbokgung Palace, Namsan Tower, cherry blossoms in Seoul"),
    ("TH", "thailand",    "Thailand",       "Wat Arun temple, Bangkok skyline, floating market"),
    ("AU", "australia",   "Australia",      "Sydney Opera House, Great Barrier Reef, Uluru outback"),

    # ─── 新規 32 カ国 ───
    ("GB", "uk",          "United Kingdom", "Big Ben, Tower Bridge, London Eye, red telephone booth"),
    ("IT", "italy",       "Italy",          "Colosseum, Venice canals, Amalfi Coast, Tuscan hills"),
    ("DE", "germany",     "Germany",        "Brandenburg Gate, Neuschwanstein Castle, Rhine Valley"),
    ("ES", "spain",       "Spain",          "Sagrada Familia, Alhambra, Mediterranean coast"),
    ("PT", "portugal",    "Portugal",       "Belem Tower, Lisbon tram, Douro Valley vineyards"),
    ("NL", "netherlands", "Netherlands",    "Amsterdam canals, windmills, tulip fields"),
    ("CH", "switzerland", "Switzerland",    "Matterhorn, Lake Geneva, alpine village"),
    ("AT", "austria",     "Austria",        "Schoenbrunn Palace, Vienna, alpine scenery"),
    ("GR", "greece",      "Greece",         "Santorini white buildings, Parthenon, Aegean Sea"),
    ("TR", "turkey",      "Turkey",         "Cappadocia hot air balloons, Hagia Sophia, Bosphorus"),
    ("CZ", "czech",       "Czech Republic", "Prague Castle, Charles Bridge, old town square"),
    ("HR", "croatia",     "Croatia",        "Dubrovnik old city walls, Plitvice Lakes"),
    ("SE", "sweden",      "Sweden",         "Stockholm old town, northern lights, colorful buildings"),
    ("FI", "finland",     "Finland",        "Helsinki Cathedral, aurora borealis, snowy forest cabin"),
    ("DK", "denmark",     "Denmark",        "Nyhavn colorful harbor, Little Mermaid, Copenhagen"),
    ("NO", "norway",      "Norway",         "fjords, northern lights, Bergen colorful houses"),

    ("TW", "taiwan",      "Taiwan",         "Taipei 101, Jiufen old street, Sun Moon Lake, night market"),
    ("HK", "hongkong",    "Hong Kong",      "Victoria Harbour skyline, neon signs, Star Ferry"),
    ("CN", "china",       "China",          "Great Wall, Forbidden City, Li River karst mountains"),
    ("VN", "vietnam",     "Vietnam",        "Ha Long Bay, lanterns of Hoi An, rice paddies"),
    ("PH", "philippines", "Philippines",    "Chocolate Hills, Palawan beaches, Manila skyline"),
    ("MY", "malaysia",    "Malaysia",       "Petronas Towers, Langkawi, Batu Caves"),
    ("KH", "cambodia",    "Cambodia",       "Angkor Wat sunrise, Tonle Sap, ancient temples"),
    ("MM", "myanmar",     "Myanmar",        "Bagan temples at sunrise, Shwedagon Pagoda, Inle Lake"),
    ("IN", "india",       "India",          "Taj Mahal, Varanasi ghats, Rajasthan colorful architecture"),
    ("LK", "srilanka",    "Sri Lanka",      "Sigiriya rock fortress, tea plantations, tropical beach"),
    ("NP", "nepal",       "Nepal",          "Himalayas, Kathmandu temples, prayer flags"),
    ("MV", "maldives",    "Maldives",       "overwater bungalows, crystal clear turquoise lagoon, coral reef"),

    ("CA", "canada",      "Canada",         "Banff National Park, Niagara Falls, Toronto CN Tower"),
    ("MX", "mexico",      "Mexico",         "Chichen Itza, Cancun beach, colorful Guanajuato streets"),
    ("BR", "brazil",      "Brazil",         "Christ the Redeemer, Copacabana, Amazon rainforest"),
    ("PE", "peru",        "Peru",           "Machu Picchu, Sacred Valley, Andes mountains"),

    ("EG", "egypt",       "Egypt",          "Pyramids of Giza, Sphinx, Nile River, ancient temples"),
    ("MA", "morocco",     "Morocco",        "Marrakech medina, blue city Chefchaouen, Sahara desert"),
    ("KE", "kenya",       "Kenya",          "Masai Mara safari, Mt Kilimanjaro view, savanna wildlife"),
    ("ZA", "southafrica", "South Africa",   "Table Mountain, Cape Town, safari landscape"),
    ("TZ", "tanzania",    "Tanzania",       "Serengeti, Zanzibar beach, Mount Kilimanjaro"),

    ("NZ", "newzealand",  "New Zealand",    "Milford Sound, Hobbiton, mountain lakes"),
    ("AE", "uae",         "UAE",            "Burj Khalifa, Dubai skyline, desert dunes"),
    ("QA", "qatar",       "Qatar",          "Doha skyline, Museum of Islamic Art, desert rose"),
    ("HU", "hungary",     "Hungary",        "Budapest Parliament, Chain Bridge, thermal baths"),
]

# ─── 共通プロンプトテンプレート ───────────────────────────
PROMPT_TEMPLATE = (
    "A beautiful, vibrant travel header illustration of {country_name}. "
    "Featuring iconic landmarks and scenery: {landmarks}. "
    "Wide panoramic landscape composition, warm and inviting colors, "
    "slightly dreamy watercolor-meets-digital-art style, "
    "soft golden-hour lighting, no text or letters, no people, "
    "clean and elegant composition suitable as a mobile app header background. "
    "The image should feel aspirational and wanderlust-inspiring."
)


def generate_image(prompt):
    """OpenAI DALL-E 3 API を requests で直接呼び出す"""
    headers = {
        "Authorization": "Bearer " + API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "model": "dall-e-3",
        "prompt": prompt,
        "size": SIZE,
        "quality": QUALITY,
        "n": 1,
    }
    resp = requests.post(API_URL, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    return data["data"][0]["url"]


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total = len(COUNTRIES)
    skipped = 0
    generated = 0
    errors = []

    print("\n" + "=" * 60)
    print("  TripReady 国別ヘッダー画像生成")
    print("  対象: {} カ国  |  出力先: {}".format(total, OUTPUT_DIR))
    print("  サイズ: {}  |  品質: {}".format(SIZE, QUALITY))
    print("=" * 60 + "\n")

    for i, (code, file_key, display_name, landmarks) in enumerate(COUNTRIES, 1):
        filename = "country_{}.png".format(file_key)
        filepath = os.path.join(OUTPUT_DIR, filename)

        # 既存画像のスキップ
        if os.path.exists(filepath):
            print("  [{}/{}] skip  {} ({}) -- 既存画像あり".format(i, total, code, display_name))
            skipped += 1
            continue

        prompt = PROMPT_TEMPLATE.format(country_name=display_name, landmarks=landmarks)
        sys.stdout.write("  [{}/{}] art  {} ({}) -- 生成中...".format(i, total, code, display_name))
        sys.stdout.flush()

        try:
            image_url = generate_image(prompt)

            # 画像をダウンロード
            img_data = requests.get(image_url, timeout=60).content
            with open(filepath, "wb") as f:
                f.write(img_data)

            generated += 1
            print(" OK ({} KB)".format(len(img_data) // 1024))

            # API レートリミット対策
            if i < total:
                time.sleep(12)

        except Exception as e:
            errors.append((code, display_name, str(e)))
            print(" ERROR: {}".format(e))
            time.sleep(5)

    # ─── 結果サマリー ─────────────────────────────────────
    print("\n" + "=" * 60)
    print("  完了！")
    print("  生成: {}  |  スキップ: {}  |  エラー: {}".format(generated, skipped, len(errors)))
    if errors:
        print("\n  エラー一覧:")
        for code, name, err in errors:
            print("     {} ({}): {}".format(code, name, err))
    print("=" * 60 + "\n")

    # ─── COUNTRY_HEADERS マッピング生成 ────────────────────
    print("\n// ↓ app/trip/[id].tsx にコピペしてください")
    print("const COUNTRY_HEADERS: Record<string, any> = {")
    for code, file_key, display_name, _ in COUNTRIES:
        filename = "country_{}.png".format(file_key)
        filepath = os.path.join(OUTPUT_DIR, filename)
        if os.path.exists(filepath):
            print("  {}: require('../../assets/generated/{}'),".format(code, filename))
    print("};")


if __name__ == "__main__":
    main()
