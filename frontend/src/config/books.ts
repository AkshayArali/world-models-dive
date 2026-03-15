import type { BookDef } from "../types";

export const BOOKS: BookDef[] = [
  {
    id: "kite_runner",
    title: "The Kite Runner",
    author: "Khaled Hosseini",
    coverUrl: "./books/KiteRunner.jpg",
    splatUrl: "./splats/sensai.spz",
    sceneTitle: "Kabul, 1975",
    sceneSubtitle: "The kite-fighting tournament that changed everything",
    narrativeText:
      "The streets of Kabul hummed with the excitement of the annual kite-fighting tournament. Amir clutched the string, heart pounding, as the winter wind carried a thousand kites across a cloudless sky...",
  },
  {
    id: "ww2",
    title: "Harry Potter",
    author: "J.K. Rowling",
    coverUrl: "./books/gobletoffire.jpg",
    splatUrl: "./models/HogwartsGreatHall.spz",
    sceneTitle: "The Goblet of Fire",
    sceneSubtitle: "Hogwarts — The Triwizard Tournament",
    narrativeText:
      "The enchanted ceiling of the Great Hall reflected a stormy sky. The Goblet of Fire flickered at the center, its blue flames casting dancing shadows across the long house tables...",
    locked: false,
    splatQuality: "low",
    modelUrl: "./models/harry.fbx",
    modelScale: 0.45,
    modelRotation: [0, 0, 0],
    sceneCameraOffsetY: 3,
    sceneCameraOffsetZ: 6,
    portals: [
      {
        position: [3, 0, 2],
        radius: 1.5,
        targetSplatUrl: "./models/GryffindorCommonRoom.spz",
        targetTitle: "Gryffindor Common Room",
        targetSubtitle: "The cozy fireside haven",
        targetNarrativeText:
          "The portrait of the Fat Lady swung open. The familiar warmth of the Gryffindor Common Room enveloped Harry — crackling fire, worn armchairs, and the quiet murmur of friends...",
        targetModelScale: 34,
        targetModelPosition: [0, -5, 1.5],
        targetModelRotation: [0, 0, 0],
        targetSplatScale: 18,
        targetFloorY: -7.2,
        targetCameraOffsetZ: 16,
        targetCameraOffsetY: 12,
        targetSceneModelScale: 0.75,
        targetSceneModels: [
          {
            url: "./models/hermione.fbx",
            name: "Hermione Granger",
            greeting:
              "Oh, hello Harry! Have you finished your Potions essay yet? I've already written three rolls of parchment.",
            position: [4, 0, 0],
          },
          {
            url: "./models/ronald.fbx",
            name: "Ron Weasley",
            greeting:
              "Oi, Harry! Fancy a game of wizard's chess? I've been practising — reckon I could beat anyone in Gryffindor.",
            position: [-3, 0, -4],
          },
          {
            url: "./models/dumbledore.fbx",
            name: "Albus Dumbledore",
            greeting:
              "Ah, Harry. I had a feeling we might cross paths tonight. Tell me, have you tried the lemon drops?",
            position: [-3, 0, 4],
          },
        ],
      },
    ],
  },
  {
    id: "apollo",
    title: "Apollo 13",
    author: "Jim Lovell",
    coverUrl: "./books/Apollo11.jpg",
    splatUrl: "./splats/LunarCrateredLandscape2.spz",
    sceneTitle: "Apollo 11",
    sceneSubtitle: "The First Moon Landing",
    narrativeText:
      "The lunar module descended through the silence of space. Below, the grey expanse of the Moon stretched endlessly — craters, shadows, and the promise of one small step...",
    locked: false,
    splatQuality: "low",
    modelUrl: "./models/astronaut_run.fbx",
    modelScale: 0.3,
    modelRotation: [0, Math.PI, 0],
    sceneModels: [
      {
        url: "./models/lander.fbx",
        scale: 0.04,
        position: [5, 0.5, 8],
        rotation: [0, Math.PI / 4, 0],
      },
    ],
  },
];
