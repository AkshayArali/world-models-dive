# Book Dive — Oz Learning Worlds

**Branch:** `book-dive`
**Project:** World Models Hackathon — Turning Points

## What Is This?

An interactive STEM learning platform disguised as a storybook. Kids open *The Wonderful Wizard of Oz* in a 3D library, explore 8 Gaussian Splat worlds generated from the book's chapters, discover science hidden in the story, and take gamified quizzes — all in the browser (or VR headset).

The Wizard of Oz is a "hidden gem" for education because L. Frank Baum built the Land of Oz as a color-coded, four-quadrant map with distinct biomes — perfect for teaching geography, botany, physics, chemistry, optics, and geology through narrative.

---

## Architecture

```
frontend/           Three.js + Spark (Gaussian Splats) + Vite
├── src/index.ts    Main app — library, book animation, Oz map, world explorer, quiz
├── src/oz-data.ts  All 8 worlds: STEM topics, objects, quiz questions, progress tracking
├── index.html      UI overlays — map, intro, discovery, quiz, green spectacles
└── public/         Book covers, 3D models, splat files

backend/            FastAPI
└── main.py         REST API for worlds, map data, quiz

scripts/
├── generate_oz_worlds.py   Marble API — generates 8 biome-specific 3D worlds
└── generate_worlds.py      Original WW2 world generator (preserved)

kids-book/
└── the-wonderful-wizard-of-oz/   Full book (Project Gutenberg HTML + cover)
```

---

## The 8 Worlds

Each world maps to chapters of the book, a region on the Oz map, and a specific STEM lesson:

| # | World | Quadrant | Color | STEM Topic | Chapters |
|---|-------|----------|-------|------------|----------|
| 1 | **Kansas Prairie** | — | Gray | Physics & Meteorology (cyclones, air pressure) | Ch 1 |
| 2 | **Munchkinland** | East | Blue | Geography & Agriculture (biomes, crops, farming) | Ch 2–3 |
| 3 | **The Dark Forest** | North | Purple | Materials Science (metal vs wood vs straw, rust) | Ch 4–6 |
| 4 | **The Poppy Field** | Center | Red | Botany & Ecology (flower anatomy, pollination) | Ch 7–9 |
| 5 | **The Emerald City** | Center | Green | Optics & Light (color filters, lenses, prisms) | Ch 10–11, 15–17 |
| 6 | **Witch's Castle** | West | Yellow | Water Science & Chemistry (dissolving, states of matter) | Ch 12–14 |
| 7 | **China Country** | South | Orange | Materials & Engineering (ceramics, elasticity, fragility) | Ch 18–20 |
| 8 | **Glinda's Castle** | South | Red | Geography & Geology (rock types, erosion, fossils) | Ch 21–24 |

---

## User Flow

1. **3D Library** — Four books float on pedestals. Click *The Wonderful Wizard of Oz*.
2. **Book Open Animation** — Cinematic: book rises, cover flips, pages curl, camera dives in, white fade.
3. **Oz Map** — Four-quadrant geography map of Oz with 8 clickable world nodes. Shows progress (stars, badges).
4. **World Intro** — Story summary + STEM topic preview. **Audio narration** reads the text aloud (ElevenLabs). Play/Pause, Mute, and "Enter World" button.
5. **3D World Exploration** — Walk around a Gaussian Splat scene. Glowing orbs mark discoverable objects.
6. **Object Discovery** — Click orbs to learn science facts (e.g., "Rust is iron oxide — it forms when iron reacts with oxygen and water").
7. **Quiz** — 4 science-based multiple choice questions per world. Animated feedback + explanations.
8. **Rewards** — Stars (1–4 based on score), badges per world, progress saved to localStorage.

---

## Key Features

### Science Through Story
Quiz questions are NOT "Who is Dorothy?" — they're real science:
- *"Which part of a cyclone is the calmest?"*
- *"What happens to metal when it gets wet?"*
- *"If you look at a white wall through green glasses, what color does it appear?"*
- *"Which type of rock is most likely to contain fossils?"*

### Green Spectacles (Emerald City)
In the Emerald City world, a toggle lets kids "put on green spectacles" — a green CSS filter overlays the viewport, demonstrating how colored lenses filter light. This teaches optics through the book's own plot device.

### Object Discovery
Each world has 4 objects to find (32 total). Every object connects the story to real science:
- **Oil Can** → Lubrication reduces friction
- **Poppy Flower** → Alkaloid compounds affect the nervous system
- **Green Penny** → Copper oxidation creates green patina (same as Statue of Liberty)
- **Red Sandstone Cliff** → Iron oxide in rock (same chemistry as the Tin Woodman's rust!)

### The Four Quadrants
The Oz map itself is a geography lesson — cardinal directions, color-coded biomes, and the concept of mapping territory.

---

## Generating Real 3D Worlds

The splat scenes currently use placeholder files. To generate the real biome-accurate worlds:

```bash
export MARBLE_API_KEY="your-key"
python scripts/generate_oz_worlds.py
```

This calls the World Labs Marble API to create 8 Gaussian Splat worlds with prompts like:
- *"Vast field of brilliant scarlet red poppies stretching to the horizon, a winding yellow brick path..."*
- *"Magnificent emerald green city with towering spires and domes made of green marble and crystal..."*

Results are saved to `generated_oz_worlds.json`.

---

## API Keys (`.env`)

```
OPENAI_API_KEY=...        # Backend AI features (narrator, hints)
MARBLE_API_KEY=...        # World Labs Marble API (3D world generation)
ELEVENLABS_API_KEY=...    # ElevenLabs TTS for audio narration (required for narration)
ELEVENLABS_VOICE_ID=...  # Optional — defaults to Rachel (21m00Tcm4TlvDq8ikWAM)
```

### Audio Narration

When a kid selects a world, the intro screen reads the story summary and science intro aloud using ElevenLabs text-to-speech:

- **Backend:** `POST /api/narration` accepts `{ "text": "..." }`, calls ElevenLabs, returns `audio/mpeg`
- **Caching:** Audio is cached in `.narration_cache/` by text hash to avoid repeated API calls
- **Frontend:** Narration auto-plays when the intro overlay appears. Play/Pause and Mute controls are available.
- **Requirements:** Backend must run on port 8080, `ELEVENLABS_API_KEY` must be set in `.env`

---

## Running

```bash
# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:8081

# Backend (required for narration)
cd backend && pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8080
# Or from project root: uvicorn backend.main:app --reload --port 8080

# Generate worlds
python scripts/generate_oz_worlds.py
```

---

## Files Changed / Created

### New Files
- `frontend/src/oz-data.ts` — 8 worlds, 32 objects, 32 quiz questions, progress system
- `scripts/generate_oz_worlds.py` — Marble API world generator (8 Oz scenes)
- `backend/main.py` — FastAPI server (worlds, map, quiz endpoints)
- `frontend/public/books/WizardOfOz.jpg` — Book cover
- `book-dive.md` — This file

### Modified Files
- `frontend/src/index.ts` — Oz book in library, map UI, world exploration, object discovery, quiz system, green spectacles, progress/badges
- `frontend/index.html` — All Oz UI overlays (map, intro, discovery, quiz, HUD, green filter)
