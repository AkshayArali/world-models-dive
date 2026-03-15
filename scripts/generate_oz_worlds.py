"""
Generate Wizard of Oz 3D worlds using the World Labs Marble API.
Creates 8 distinct biome worlds for the interactive learning experience.

Usage:
    export MARBLE_API_KEY="your-key-here"
    python scripts/generate_oz_worlds.py
"""

import os
import sys
import json
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

API_KEY = os.getenv("MARBLE_API_KEY")
BASE_URL = "https://api.worldlabs.ai/marble/v1"
HEADERS = {
    "WLT-Api-Key": API_KEY or "",
    "Content-Type": "application/json",
}

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "generated_oz_worlds.json")

SCENES = [
    {
        "id": "kansas",
        "display_name": "Kansas Prairie — The Cyclone",
        "prompt": (
            "Flat gray Kansas prairie farmland, small weathered wooden farmhouse with a "
            "trapdoor cellar, dark dramatic storm clouds gathering overhead, a tornado funnel "
            "forming in the distance, windswept tall grass bending, dust and debris in the air, "
            "dramatic golden hour lighting breaking through storm clouds, photorealistic, cinematic"
        ),
    },
    {
        "id": "munchkinland",
        "display_name": "Munchkinland — Blue Country of the East",
        "prompt": (
            "Enchanted blue-themed village in a lush meadow, small thatched cottages painted blue, "
            "sparkling brook running through fields of blue wildflowers and tall blue-green crops, "
            "a bright yellow brick road winding through, colorful fruit trees, rolling green hills "
            "in background, bright warm sunshine, a scarecrow in a cornfield, magical fairy tale "
            "atmosphere, photorealistic"
        ),
    },
    {
        "id": "dark_forest",
        "display_name": "The Dark Forest — Gillikin Country (North)",
        "prompt": (
            "Dense dark enchanted forest with towering ancient trees, purple-tinged twilight "
            "filtering through thick canopy, moss-covered tree trunks, a clearing with a rusty "
            "tin figure holding an axe, scattered autumn leaves, mysterious fog between trees, "
            "rays of light breaking through, magical dark fairy tale atmosphere, photorealistic, "
            "cinematic"
        ),
    },
    {
        "id": "poppy_field",
        "display_name": "The Deadly Poppy Field",
        "prompt": (
            "Vast field of brilliant scarlet red poppies stretching to the horizon, a winding "
            "yellow brick path through the flowers, a gentle river on one side, sleeping lion "
            "among the poppies, bright blue sky, distant green hills, butterflies and bees, "
            "magical dreamlike atmosphere, warm sunlight, photorealistic, cinematic"
        ),
    },
    {
        "id": "emerald_city",
        "display_name": "The Emerald City of Oz",
        "prompt": (
            "Magnificent emerald green city with towering spires and domes made of green marble "
            "and crystal, streets paved with green stone embedded with sparkling emeralds, green "
            "glass windows reflecting green light everywhere, ornate green palace in the center, "
            "people in green clothing, green tinted atmosphere, magical glowing green light, "
            "fantasy fairy tale city, photorealistic, cinematic"
        ),
    },
    {
        "id": "witch_castle",
        "display_name": "Winkie Country & Witch's Castle (West)",
        "prompt": (
            "Barren yellow desert landscape with cracked dry earth, a dark imposing stone castle "
            "on a hill, scattered dead trees and dry scrubland, yellow-tinted dusty atmosphere, "
            "winged monkey silhouettes in the orange sky, desolate arid terrain, dry riverbed, "
            "dramatic sunset lighting casting long shadows, dark fairy tale atmosphere, "
            "photorealistic, cinematic"
        ),
    },
    {
        "id": "china_country",
        "display_name": "The Dainty China Country",
        "prompt": (
            "Magical miniature village made entirely of delicate white and painted porcelain, "
            "tiny china houses with colorful roofs, porcelain figurines of people and animals on "
            "a smooth white ground, pastel colors, a low white wall surrounding the village, "
            "twisted dark fighting trees at the border, warm soft lighting, fairy tale miniature "
            "atmosphere, photorealistic, tilt-shift effect"
        ),
    },
    {
        "id": "glinda_castle",
        "display_name": "Quadling Country & Glinda's Castle (South)",
        "prompt": (
            "Beautiful red rocky landscape with plateaus and cliff formations, red sandstone mesas "
            "and buttes, a magnificent pink and white castle with crystal towers in the distance, "
            "red wildflowers and red-leaved trees, warm golden red sunset lighting, dramatic "
            "cloud formations, red earth path leading to the castle, fairy tale meets desert "
            "canyon geology, photorealistic, cinematic"
        ),
    },
]


def generate_world(scene: dict) -> tuple[str, str]:
    """Start a Marble world generation, return (scene_id, operation_id)."""
    resp = requests.post(
        f"{BASE_URL}/worlds:generate",
        headers=HEADERS,
        json={
            "display_name": scene["display_name"],
            "model": "Marble 0.1-mini",
            "world_prompt": {
                "type": "text",
                "text_prompt": scene["prompt"],
            },
        },
    )
    resp.raise_for_status()
    data = resp.json()
    op_id = data["operation_id"]
    print(f"  Started: {scene['id']} -> operation {op_id}")
    return scene["id"], op_id


def poll_until_done(scene_id: str, operation_id: str) -> dict | None:
    """Poll an operation until it completes."""
    while True:
        resp = requests.get(
            f"{BASE_URL}/operations/{operation_id}",
            headers=HEADERS,
        )
        resp.raise_for_status()
        data = resp.json()
        progress = data.get("metadata", {}).get("progress", {})
        status = progress.get("status", "UNKNOWN")

        if data.get("done"):
            if data.get("error"):
                print(f"  FAILED: {scene_id} -- {data['error']}")
                return None
            print(f"  DONE: {scene_id}")
            return data["response"]

        print(f"  Waiting: {scene_id}: {status}...")
        time.sleep(5)


def main():
    if not API_KEY:
        print("Error: Set MARBLE_API_KEY environment variable first.")
        print("  Get your key at: https://platform.worldlabs.ai/api-keys")
        sys.exit(1)

    print("=" * 60)
    print("  Generating Wizard of Oz Worlds with Marble API")
    print("=" * 60)

    print(f"\n1. Starting {len(SCENES)} world generations...\n")
    operations = {}
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(generate_world, s): s for s in SCENES}
        for future in as_completed(futures):
            try:
                scene_id, op_id = future.result()
                operations[scene_id] = op_id
            except Exception as e:
                scene = futures[future]
                print(f"  Failed to start {scene['id']}: {e}")

    print(f"\n2. Waiting for {len(operations)} worlds (~30-45s each)...\n")

    results = {}
    for scene_id, op_id in operations.items():
        result = poll_until_done(scene_id, op_id)
        if result:
            assets = result.get("assets", {})
            splats = assets.get("splats", {}).get("spz_urls", {})
            results[scene_id] = {
                "world_id": result.get("id"),
                "marble_url": result.get("world_marble_url"),
                "spz_full": splats.get("full_res", ""),
                "spz_500k": splats.get("500k", ""),
                "spz_100k": splats.get("100k", ""),
                "pano_url": assets.get("imagery", {}).get("pano_url", ""),
                "thumbnail_url": assets.get("thumbnail_url", ""),
                "collider_mesh_url": assets.get("mesh", {}).get("collider_mesh_url", ""),
                "caption": assets.get("caption", ""),
            }

    output_path = os.path.abspath(OUTPUT_FILE)
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 60)
    print("  Results")
    print("=" * 60)

    for scene_id, data in results.items():
        print(f"\n  {scene_id}:")
        print(f"    View:  {data['marble_url']}")
        print(f"    SPZ:   {data['spz_500k'][:80]}...")

    print(f"\n  Saved to: {output_path}")
    print(f"  Generated {len(results)}/{len(SCENES)} worlds successfully.")
    print("=" * 60)


if __name__ == "__main__":
    main()
