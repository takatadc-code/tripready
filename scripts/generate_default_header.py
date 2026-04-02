#!/usr/bin/env python3
"""デフォルトヘッダー画像を1枚だけ生成"""
import os, sys, requests, json

API_KEY = "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"
OUTPUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "generated", "bg_trip_header.png")

PROMPT = (
    "A wide panoramic photograph-style image of a commercial airplane "
    "flying through beautiful sunlit clouds at golden hour. "
    "Vast open sky, soft white and golden cumulus clouds stretching to the horizon, "
    "warm sunlight filtering through gaps in the clouds, "
    "the airplane seen from a distance, small but clearly visible against the sky. "
    "Cinematic, peaceful, awe-inspiring atmosphere. "
    "Ultra-wide landscape composition (16:9), photorealistic style, "
    "no text, no UI elements, no borders."
)

print("  デフォルトヘッダー画像を生成中...")
resp = requests.post(
    "https://api.openai.com/v1/images/generations",
    headers={"Authorization": "Bearer " + API_KEY, "Content-Type": "application/json"},
    json={"model": "dall-e-3", "prompt": PROMPT, "size": "1792x1024", "quality": "standard", "n": 1},
    timeout=120,
)
resp.raise_for_status()
url = resp.json()["data"][0]["url"]
img = requests.get(url, timeout=60).content
with open(OUTPUT, "wb") as f:
    f.write(img)
print("  OK! ({} KB) -> {}".format(len(img) // 1024, OUTPUT))
