"""
Generate WW2 3D worlds using the World Labs Marble API.
Run this FIRST to pre-generate all scene environments.

Usage:
    export MARBLE_API_KEY="your-key-here"
    python scripts/generate_worlds.py
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

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "generated_worlds.json")

SCENES = [
    {
        "id": "oval_office",
        "display_name": "FDR Oval Office 1941",
        "prompt": (
            "1940s Oval Office in the White House during World War II, warm wood paneling, "
            "large mahogany Resolute desk covered with papers and military maps, American flags "
            "flanking the desk, tall arched windows with heavy green curtains, warm desk lamp lighting, "
            "globe on a wooden stand, rotary telephone, cigarette smoke in the air, "
            "historic wartime atmosphere, photorealistic, cinematic lighting"
        ),
    },
    {
        "id": "war_room_europe",
        "display_name": "Allied War Room Europe 1943",
        "prompt": (
            "Underground Allied military war room 1943, massive wooden table covered in European "
            "theater maps with pins and colored string marking battle lines, dim overhead industrial "
            "lighting with green shaded lamps, concrete walls with large strategic maps of Europe, "
            "radio communication equipment, military officers' chairs, ashtrays, coffee cups, "
            "filing cabinets, tense wartime atmosphere, photorealistic"
        ),
    },
    {
        "id": "pacific_command",
        "display_name": "Pacific Naval Command 1942",
        "prompt": (
            "US Navy Pacific Fleet command center in Hawaii 1942, large bright room with tall windows "
            "overlooking the harbor, naval charts and Pacific Ocean maps spread across tables, "
            "radio communication stations with operators, model ships and aircraft on shelves, "
            "dramatic tropical sunlight through venetian blinds casting shadows, ceiling fans, "
            "tense military atmosphere, photorealistic World War 2"
        ),
    },
    {
        "id": "churchill_war_rooms",
        "display_name": "Churchill War Cabinet Room 1940",
        "prompt": (
            "Churchill War Rooms underground bunker in London 1940, low concrete ceiling with "
            "exposed pipes and ventilation ducts, long wooden conference table with green leather "
            "chairs, walls covered in large military maps with colored pins, dim overhead industrial "
            "lighting, rotary telephones, ashtrays with cigars, filing cabinets, clock on the wall, "
            "cramped claustrophobic wartime atmosphere, photorealistic"
        ),
    },
    {
        "id": "bombed_london",
        "display_name": "Bombed London Street 1940",
        "prompt": (
            "London street during the Blitz 1940, bombed buildings with exposed brick walls and "
            "rubble, smoke rising from fires, overcast grey sky, sandbag barricades, an abandoned "
            "double decker bus, scattered debris and broken glass, air raid wardens, distant "
            "searchlights, dramatic moody atmosphere, photorealistic World War 2"
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
    print(f"  ✓ Started: {scene['id']} → operation {op_id}")
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
                print(f"  ✗ FAILED: {scene_id} — {data['error']}")
                return None
            print(f"  ✓ DONE: {scene_id}")
            return data["response"]

        print(f"  ⏳ {scene_id}: {status}...")
        time.sleep(5)


def main():
    if not API_KEY:
        print("Error: Set MARBLE_API_KEY environment variable first.")
        print("  Get your key at: https://platform.worldlabs.ai/api-keys")
        sys.exit(1)

    print("=" * 60)
    print("  Generating WW2 Worlds with Marble API")
    print("=" * 60)

    # Fire all generations in parallel
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
                print(f"  ✗ Failed to start {scene['id']}: {e}")

    print(f"\n2. Waiting for {len(operations)} worlds (~30-45s each with mini model)...\n")

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

    # Save results
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
    print(f"\n  Open the marble_url links in your browser to preview each world!")
    print("=" * 60)


if __name__ == "__main__":
    main()
