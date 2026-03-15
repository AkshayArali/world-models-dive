"""
Oz Learning Worlds — Backend API

Serves chapter data, quiz validation, and progress tracking.
Run: uvicorn backend.main:app --reload --port 8080
"""

import json
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Oz Learning Worlds API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

WORLDS_FILE = Path(__file__).parent.parent / "generated_oz_worlds.json"

OZ_WORLDS = [
    {
        "id": "kansas",
        "name": "Kansas Prairie",
        "chapters": [1],
        "quadrant": "kansas",
        "biomeColor": "#8B8682",
        "stemTopic": "Physics & Meteorology",
        "stemTitle": "The Science of Cyclones",
        "badge": {"name": "Storm Chaser", "emoji": "🌪️"},
    },
    {
        "id": "munchkinland",
        "name": "Munchkinland",
        "chapters": [2, 3],
        "quadrant": "east",
        "biomeColor": "#4A90D9",
        "stemTopic": "Geography & Agriculture",
        "stemTitle": "Biomes & Farming",
        "badge": {"name": "Munchkin Farmer", "emoji": "🌾"},
    },
    {
        "id": "dark_forest",
        "name": "The Dark Forest",
        "chapters": [4, 5, 6],
        "quadrant": "north",
        "biomeColor": "#7B3FA0",
        "stemTopic": "Materials Science & Chemistry",
        "stemTitle": "Metal, Wood & Straw",
        "badge": {"name": "Material Scientist", "emoji": "🔬"},
    },
    {
        "id": "poppy_field",
        "name": "The Deadly Poppy Field",
        "chapters": [7, 8, 9],
        "quadrant": "center",
        "biomeColor": "#E74C3C",
        "stemTopic": "Botany & Ecology",
        "stemTitle": "Flowers, Pollination & Ecosystems",
        "badge": {"name": "Botanist Explorer", "emoji": "🌺"},
    },
    {
        "id": "emerald_city",
        "name": "The Emerald City",
        "chapters": [10, 11, 15, 16, 17],
        "quadrant": "center",
        "biomeColor": "#2ECC71",
        "stemTopic": "Optics & Light Science",
        "stemTitle": "Color, Lenses & Light",
        "badge": {"name": "Light Scientist", "emoji": "💡"},
    },
    {
        "id": "witch_castle",
        "name": "Winkie Country & Witch's Castle",
        "chapters": [12, 13, 14],
        "quadrant": "west",
        "biomeColor": "#F1C40F",
        "stemTopic": "Water Science & Chemistry",
        "stemTitle": "Water, States of Matter & Dissolving",
        "badge": {"name": "Water Chemist", "emoji": "💧"},
    },
    {
        "id": "china_country",
        "name": "China Country & Fighting Trees",
        "chapters": [18, 19, 20],
        "quadrant": "south",
        "biomeColor": "#E67E22",
        "stemTopic": "Materials & Engineering",
        "stemTitle": "Ceramics, Strength & Fragility",
        "badge": {"name": "Master Engineer", "emoji": "⚙️"},
    },
    {
        "id": "glinda_castle",
        "name": "Quadling Country & Glinda's Castle",
        "chapters": [21, 22, 23, 24],
        "quadrant": "south",
        "biomeColor": "#E74C3C",
        "stemTopic": "Geography & Geology",
        "stemTitle": "Rocks, Mountains & Landforms",
        "badge": {"name": "Geologist", "emoji": "🪨"},
    },
]


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "oz-learning-worlds"}


@app.get("/api/worlds")
def list_worlds():
    generated = {}
    if WORLDS_FILE.exists():
        with open(WORLDS_FILE) as f:
            generated = json.load(f)

    result = []
    for w in OZ_WORLDS:
        entry = {**w}
        if w["id"] in generated:
            entry["splat_urls"] = generated[w["id"]]
        result.append(entry)
    return {"worlds": result}


@app.get("/api/worlds/{world_id}")
def get_world(world_id: str):
    world = next((w for w in OZ_WORLDS if w["id"] == world_id), None)
    if not world:
        return {"error": "World not found"}, 404

    generated = {}
    if WORLDS_FILE.exists():
        with open(WORLDS_FILE) as f:
            generated = json.load(f)

    result = {**world}
    if world_id in generated:
        result["splat_urls"] = generated[world_id]

    return result


class QuizSubmission(BaseModel):
    world_id: str
    answers: list[int]


@app.post("/api/quiz/submit")
def submit_quiz(submission: QuizSubmission):
    return {
        "world_id": submission.world_id,
        "answers_received": len(submission.answers),
        "message": "Quiz scoring is handled client-side for instant feedback",
    }


@app.get("/api/map")
def get_oz_map():
    return {
        "quadrants": [
            {
                "name": "North — Gillikin Country",
                "color": "#7B3FA0",
                "biome": "Dense Forest / Woodland",
                "lessons": ["Dense vegetation", "Tree types", "Canopy ecosystems"],
            },
            {
                "name": "East — Munchkin Country",
                "color": "#4A90D9",
                "biome": "Temperate Grassland / Farmland",
                "lessons": ["Agriculture", "Crop growth", "Blue in nature"],
            },
            {
                "name": "West — Winkie Country",
                "color": "#F1C40F",
                "biome": "Desert / Arid Landscape",
                "lessons": ["Water scarcity", "Hard terrain", "Dissolving"],
            },
            {
                "name": "South — Quadling Country",
                "color": "#E74C3C",
                "biome": "Rocky / Mountainous",
                "lessons": ["Plateaus", "Cliff formations", "Geological features"],
            },
        ],
        "center": {
            "name": "Emerald City",
            "color": "#2ECC71",
            "lessons": ["Optics", "Light and color", "Lenses"],
        },
    }
