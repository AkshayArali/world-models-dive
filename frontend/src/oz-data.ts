export interface OzObject {
  id: string;
  name: string;
  emoji: string;
  fact: string;
  stemConnection: string;
  position: [number, number, number];
}

export interface OzQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface OzWorld {
  id: string;
  name: string;
  chapters: number[];
  quadrant: "east" | "west" | "south" | "north" | "center" | "kansas";
  biomeColor: string;
  biomeColorHex: number;
  stemTopic: string;
  stemTitle: string;
  storySummary: string;
  scienceIntro: string;
  splatUrl: string;
  marblePrompt: string;
  mapPosition: [number, number]; // percentage position on the Oz map [x%, y%]
  objects: OzObject[];
  quiz: OzQuizQuestion[];
  badge: { name: string; emoji: string };
}

export const OZ_WORLDS: OzWorld[] = [
  {
    id: "kansas",
    name: "Kansas Prairie",
    chapters: [1],
    quadrant: "kansas",
    biomeColor: "#8B8682",
    biomeColorHex: 0x8b8682,
    stemTopic: "Physics & Meteorology",
    stemTitle: "The Science of Cyclones",
    storySummary:
      "Dorothy lives on the gray Kansas prairie with Uncle Henry, Aunt Em, and her little dog Toto. When a powerful cyclone strikes, the house is lifted into the sky and carried far away to the magical Land of Oz!",
    scienceIntro:
      "Tornadoes are powerful rotating columns of air. Let's learn about wind speed, air pressure, and how cyclones form!",
    splatUrl: "./splats/sensai.spz",
    marblePrompt:
      "Flat gray Kansas prairie farmland, small weathered wooden farmhouse with a trapdoor cellar, dark dramatic storm clouds gathering overhead, a tornado funnel forming in the distance, windswept tall grass bending, dust and debris in the air, dramatic golden hour lighting breaking through storm clouds, photorealistic, cinematic",
    mapPosition: [50, 95],
    objects: [
      {
        id: "cyclone_cellar",
        name: "Cyclone Cellar",
        emoji: "🕳️",
        fact: "A cyclone cellar is an underground shelter. Tornadoes can have wind speeds over 300 mph — strong enough to lift houses! Underground is the safest place because wind can't reach you below ground level.",
        stemConnection: "Wind speed and air pressure decrease underground",
        position: [0, 0.3, -1],
      },
      {
        id: "weather_vane",
        name: "Weather Vane",
        emoji: "🐓",
        fact: "Weather vanes point in the direction the wind is blowing FROM. Before weather satellites, farmers used these to predict storms. A sudden shift in wind direction often means a storm is coming!",
        stemConnection: "Wind direction measurement and weather prediction",
        position: [1.5, 1.8, 0.5],
      },
      {
        id: "storm_debris",
        name: "Flying Debris",
        emoji: "🌪️",
        fact: "Inside a tornado, the fastest winds are near the outer edge, not the center. The calm center is called the 'eye.' Objects get lifted because the air pressure inside a tornado is much lower than outside.",
        stemConnection: "Bernoulli's principle — fast-moving air creates low pressure",
        position: [-1, 2, 1],
      },
      {
        id: "thermometer",
        name: "Barometer",
        emoji: "🌡️",
        fact: "Before a tornado, air pressure drops dramatically. A barometer measures air pressure. Falling pressure means a storm is approaching. Meteorologists use this data to issue tornado warnings!",
        stemConnection: "Air pressure measurement and storm prediction",
        position: [0.5, 1, -0.5],
      },
    ],
    quiz: [
      {
        id: "k1",
        question: "Which part of a cyclone is the calmest?",
        options: ["The outer wall", "The eye (center)", "The base", "The top"],
        correctIndex: 1,
        explanation:
          "The eye of a tornado or hurricane is a calm area at the center. The most dangerous winds spin around the eye in the 'eyewall.'",
      },
      {
        id: "k2",
        question: "Why does a tornado lift objects off the ground?",
        options: [
          "Gravity reverses inside a tornado",
          "The low air pressure inside sucks things up",
          "Tornadoes are magnetic",
          "The ground pushes objects up",
        ],
        correctIndex: 1,
        explanation:
          "Fast-spinning air creates very low pressure inside the tornado. The higher pressure outside pushes objects toward the low-pressure center and upward. This is related to Bernoulli's principle!",
      },
      {
        id: "k3",
        question: "What instrument measures air pressure to predict storms?",
        options: ["Thermometer", "Barometer", "Speedometer", "Telescope"],
        correctIndex: 1,
        explanation:
          "A barometer measures atmospheric pressure. Rapidly falling pressure is one of the best indicators that a severe storm or tornado is approaching.",
      },
      {
        id: "k4",
        question: "Where is the safest place during a tornado?",
        options: [
          "On the roof",
          "In a car",
          "Underground in a cellar",
          "Near a window",
        ],
        correctIndex: 2,
        explanation:
          "Underground shelters protect you from the extreme winds. Tornado winds can't reach below ground level. That's why Dorothy's family had a cyclone cellar!",
      },
    ],
    badge: { name: "Storm Chaser", emoji: "🌪️" },
  },

  {
    id: "munchkinland",
    name: "Munchkinland",
    chapters: [2, 3],
    quadrant: "east",
    biomeColor: "#4A90D9",
    biomeColorHex: 0x4a90d9,
    stemTopic: "Geography & Agriculture",
    stemTitle: "Biomes & Farming",
    storySummary:
      "Dorothy lands in the beautiful blue Munchkin Country of the East. She meets the Good Witch of the North and the tiny Munchkins, receives magical Silver Shoes, and sets off on the Yellow Brick Road. Along the way, she rescues a Scarecrow from a cornfield!",
    scienceIntro:
      "Different regions have different climates and crops. Let's explore how geography shapes what grows where!",
    splatUrl: "./splats/sensai.spz",
    marblePrompt:
      "Enchanted blue-themed village in a lush meadow, small thatched cottages painted blue, sparkling brook running through fields of blue wildflowers and tall blue-green crops, a bright yellow brick road winding through, colorful fruit trees, rolling green hills in background, bright warm sunshine, a scarecrow in a cornfield, magical fairy tale atmosphere, photorealistic",
    mapPosition: [78, 45],
    objects: [
      {
        id: "silver_shoes",
        name: "Silver Shoes",
        emoji: "👟",
        fact: "Silver is a precious metal and one of the best conductors of electricity and heat. It's found in the Earth's crust and has been used by humans for over 5,000 years for jewelry, coins, and tools!",
        stemConnection: "Metallic elements and conductivity",
        position: [-0.5, 0.2, 0],
      },
      {
        id: "corn_stalk",
        name: "Corn Stalk",
        emoji: "🌽",
        fact: "Corn (maize) is one of the world's most important crops. A single corn plant can grow over 8 feet tall! Corn needs lots of sunlight and warm soil — that's why it grows best in temperate grassland biomes.",
        stemConnection: "Crop growth depends on climate and soil conditions",
        position: [1.2, 1.5, -0.8],
      },
      {
        id: "yellow_brick",
        name: "Yellow Brick Road",
        emoji: "🧱",
        fact: "Bricks are made from clay heated to over 2,000°F in a kiln. The color depends on the minerals in the clay — iron makes red bricks, while lime and sulfur can make yellow bricks!",
        stemConnection: "Mineral composition determines material color",
        position: [0, 0.1, 1.5],
      },
      {
        id: "blue_flower",
        name: "Blue Wildflower",
        emoji: "🔵",
        fact: "Blue is actually the rarest color in nature! Very few plants produce true blue pigment. Most 'blue' flowers use a trick with pH levels in their cells to reflect blue light wavelengths.",
        stemConnection: "Light wavelengths and how color works in nature",
        position: [-1.2, 0.4, 0.8],
      },
    ],
    quiz: [
      {
        id: "m1",
        question:
          "In the Land of Oz, the East (Munchkin Country) is themed blue. Which biome is it most like?",
        options: [
          "Desert",
          "Temperate grassland/farmland",
          "Arctic tundra",
          "Tropical rainforest",
        ],
        correctIndex: 1,
        explanation:
          "Munchkin Country has rich farmland, crops, and rolling hills — just like temperate grassland biomes where most of the world's food is grown!",
      },
      {
        id: "m2",
        question:
          "Why is blue the rarest flower color in nature?",
        options: [
          "Bees don't like blue",
          "Blue soil doesn't exist",
          "Very few plants can produce blue pigment",
          "Blue flowers only grow at night",
        ],
        correctIndex: 2,
        explanation:
          "True blue pigment is extremely rare in the plant kingdom. Most 'blue' flowers actually use molecular tricks to reflect blue light wavelengths!",
      },
      {
        id: "m3",
        question: "What makes yellow bricks yellow?",
        options: [
          "They're painted after baking",
          "Minerals like lime and sulfur in the clay",
          "Yellow sand is mixed in",
          "Sunlight changes their color",
        ],
        correctIndex: 1,
        explanation:
          "The color of a brick depends on the minerals in the clay. Iron-rich clay makes red bricks, while clay with lime and sulfur minerals bakes to a yellow color!",
      },
      {
        id: "m4",
        question: "Which direction is Munchkin Country on the Oz map?",
        options: ["North", "South", "East", "West"],
        correctIndex: 2,
        explanation:
          "Munchkin Country is in the East of Oz. On a compass, East is to the right — where the sun rises! Learning cardinal directions helps us read any map.",
      },
    ],
    badge: { name: "Munchkin Farmer", emoji: "🌾" },
  },

  {
    id: "dark_forest",
    name: "The Dark Forest",
    chapters: [4, 5, 6],
    quadrant: "north",
    biomeColor: "#7B3FA0",
    biomeColorHex: 0x7b3fa0,
    stemTopic: "Materials Science & Chemistry",
    stemTitle: "Metal, Wood & Straw",
    storySummary:
      "In the dark forest, Dorothy meets two new friends: the Tin Woodman, who has rusted stiff and needs oil, and the Cowardly Lion, who is afraid despite his great size. Each companion wants something from the great Wizard of Oz.",
    scienceIntro:
      "The Tin Woodman rusts, the Scarecrow is made of straw, and trees are made of wood. Let's learn how different materials behave!",
    splatUrl: "./splats/sensai.spz",
    marblePrompt:
      "Dense dark enchanted forest with towering ancient trees, purple-tinged twilight filtering through thick canopy, moss-covered tree trunks, a clearing with a rusty tin figure holding an axe, scattered autumn leaves, mysterious fog between trees, rays of light breaking through, magical dark fairy tale atmosphere, photorealistic, cinematic",
    mapPosition: [50, 20],
    objects: [
      {
        id: "oil_can",
        name: "Oil Can",
        emoji: "🛢️",
        fact: "Oil is a lubricant — it fills the tiny gaps between metal parts so they slide smoothly. Without oil, metal joints grind together, create friction, and eventually rust. That's why the Tin Woodman always carries an oil can!",
        stemConnection: "Lubrication reduces friction between surfaces",
        position: [0.8, 0.3, -0.5],
      },
      {
        id: "tin_axe",
        name: "Tin Woodman's Axe",
        emoji: "🪓",
        fact: "Tin is actually a coating! The 'Tin Man' is really made of steel with a tin coating. Tin resists corrosion and protects the metal underneath — that's why food cans are 'tin-plated' steel.",
        stemConnection: "Protective metal coatings prevent corrosion",
        position: [-0.5, 0.8, 0.3],
      },
      {
        id: "rust_patch",
        name: "Rust Spot",
        emoji: "🟤",
        fact: "Rust is iron oxide — it forms when iron reacts with oxygen and water. This chemical reaction is called oxidation. It's why the Tin Woodman seizes up in the rain! Rust makes metal weak and brittle.",
        stemConnection: "Oxidation: iron + oxygen + water = iron oxide (rust)",
        position: [0, 1.2, 0],
      },
      {
        id: "straw_bundle",
        name: "Scarecrow's Straw",
        emoji: "🌾",
        fact: "Straw is the dried stem of grain plants like wheat. Unlike metal, straw is organic — it decomposes naturally. It's lightweight, flexible, and a great insulator. But it burns easily, which is the Scarecrow's biggest fear!",
        stemConnection: "Organic vs. inorganic materials have different properties",
        position: [1.5, 0.5, 1],
      },
    ],
    quiz: [
      {
        id: "f1",
        question: "What happens to metal when it gets wet and is exposed to air?",
        options: [
          "It gets stronger",
          "It rusts (oxidizes)",
          "It melts",
          "It grows bigger",
        ],
        correctIndex: 1,
        explanation:
          "When iron meets water and oxygen, a chemical reaction called oxidation occurs. This creates iron oxide — rust! That's why the Tin Woodman seized up when caught in the rain.",
      },
      {
        id: "f2",
        question: "Which tool fixes the Tin Woodman?",
        options: ["Water", "Oil can", "Hammer", "Glue"],
        correctIndex: 1,
        explanation:
          "Oil is a lubricant that reduces friction between metal joints. Water would actually make the problem worse by causing more rust! Oil fills tiny gaps and lets parts slide smoothly.",
      },
      {
        id: "f3",
        question:
          "Which material is organic (comes from living things)?",
        options: ["Tin", "Iron", "Straw", "Rust"],
        correctIndex: 2,
        explanation:
          "Straw comes from dried plant stems — it's organic material. Tin and iron are metals (inorganic), and rust is a chemical compound formed from iron oxidation.",
      },
      {
        id: "f4",
        question: "Why does tin coating protect steel from rusting?",
        options: [
          "Tin is magnetic and repels water",
          "Tin creates a barrier blocking oxygen and water",
          "Tin absorbs all the rust",
          "Tin is heavier than steel",
        ],
        correctIndex: 1,
        explanation:
          "Tin doesn't react easily with oxygen or water. By coating steel with tin, you create a protective barrier that prevents the iron in steel from contacting moisture and air — stopping rust before it starts!",
      },
    ],
    badge: { name: "Material Scientist", emoji: "🔬" },
  },

  {
    id: "poppy_field",
    name: "The Deadly Poppy Field",
    chapters: [7, 8, 9],
    quadrant: "center",
    biomeColor: "#E74C3C",
    biomeColorHex: 0xe74c3c,
    stemTopic: "Botany & Ecology",
    stemTitle: "Flowers, Pollination & Ecosystems",
    storySummary:
      "On their journey, the travelers must cross a vast field of beautiful scarlet poppies. But the flowers are deadly — their scent makes Dorothy and the Lion fall into a deep sleep! Tiny field mice come to the rescue, pulling the sleeping Lion to safety.",
    scienceIntro:
      "Plants can be beautiful AND dangerous. Let's learn about flower anatomy, pollination, and how tiny animals play big roles in ecosystems!",
    splatUrl: "./splats/sensai.spz",
    marblePrompt:
      "Vast field of brilliant scarlet red poppies stretching to the horizon, a winding yellow brick path through the flowers, a gentle river on one side, sleeping lion among the poppies, bright blue sky, distant green hills, butterflies and bees, magical dreamlike atmosphere, warm sunlight, photorealistic, cinematic",
    mapPosition: [50, 50],
    objects: [
      {
        id: "poppy_flower",
        name: "Scarlet Poppy",
        emoji: "🌺",
        fact: "Poppies contain compounds called alkaloids in their sap. Some alkaloids can cause drowsiness — that's the 'deadly' sleep in the story! Real poppy fields won't put you to sleep, but the chemistry is based on real science.",
        stemConnection: "Plants produce chemical compounds that affect animals",
        position: [0.5, 0.3, 0.5],
      },
      {
        id: "flower_parts",
        name: "Flower Anatomy",
        emoji: "🌸",
        fact: "Every flower has key parts: PETALS attract pollinators with color, the STAMEN produces pollen (male), and the PISTIL receives pollen (female). The STEM carries water up from roots, and SEPALS protect the bud before it opens!",
        stemConnection: "Flower parts each serve a purpose in reproduction",
        position: [-1, 0.6, -0.5],
      },
      {
        id: "field_mouse",
        name: "Field Mouse",
        emoji: "🐭",
        fact: "Mice are crucial to ecosystems! They spread seeds in their droppings, aerate soil with their burrows, and are food for hawks, owls, and foxes. Even tiny animals have enormous impact on their environment.",
        stemConnection: "Every creature plays a role in the food web",
        position: [0, 0.1, -1],
      },
      {
        id: "bee",
        name: "Pollinating Bee",
        emoji: "🐝",
        fact: "Bees visit flowers to drink nectar and collect pollen. As they move between flowers, pollen sticks to their fuzzy bodies and transfers to the next flower. This pollination is how most flowering plants reproduce — bees pollinate about 75% of our food crops!",
        stemConnection: "Cross-pollination by insects is essential for plant reproduction",
        position: [1.2, 1, 0],
      },
    ],
    quiz: [
      {
        id: "p1",
        question: "Which part of a flower produces pollen?",
        options: ["Petals", "Stem", "Stamen", "Roots"],
        correctIndex: 2,
        explanation:
          "The stamen is the male part of a flower. It has a thin stalk (filament) topped by the anther, which produces tiny pollen grains needed for reproduction.",
      },
      {
        id: "p2",
        question:
          "Why are the poppies 'deadly' in the story? What real science is this based on?",
        options: [
          "They're poisonous to touch",
          "They contain chemical alkaloids that cause drowsiness",
          "Their thorns are sharp",
          "They produce toxic oxygen",
        ],
        correctIndex: 1,
        explanation:
          "Poppies produce alkaloid compounds in their sap. Some alkaloids affect the nervous system and can cause sleepiness. The story exaggerates this real chemical property!",
      },
      {
        id: "p3",
        question:
          "About how much of our food crops depend on bee pollination?",
        options: ["About 10%", "About 25%", "About 75%", "About 100%"],
        correctIndex: 2,
        explanation:
          "Around 75% of the world's food crops depend at least partly on pollination by bees and other insects. Without bees, we'd lose most fruits, vegetables, and nuts!",
      },
      {
        id: "p4",
        question: "Why are field mice important to an ecosystem?",
        options: [
          "They eat all the weeds",
          "They spread seeds, aerate soil, and are prey for larger animals",
          "They keep flowers warm at night",
          "They produce oxygen",
        ],
        correctIndex: 1,
        explanation:
          "Mice play multiple roles: they spread seeds through their droppings, their burrows aerate the soil helping plants grow, and they're a key food source for predators like owls and foxes. Even tiny creatures are vital!",
      },
    ],
    badge: { name: "Botanist Explorer", emoji: "🌺" },
  },

  {
    id: "emerald_city",
    name: "The Emerald City",
    chapters: [10, 11, 15, 16, 17],
    quadrant: "center",
    biomeColor: "#2ECC71",
    biomeColorHex: 0x2ecc71,
    stemTopic: "Optics & Light Science",
    stemTitle: "Color, Lenses & Light",
    storySummary:
      "Dorothy and friends finally reach the magnificent Emerald City! But everyone must wear green-tinted spectacles locked with a key before entering. Everything inside looks brilliantly green — the buildings, the food, even the people's skin. Is the city really made of emeralds, or is it a trick of light?",
    scienceIntro:
      "The green spectacles change how everything looks! Let's discover how colored lenses filter light and how our eyes perceive color.",
    splatUrl: "./splats/sensai.spz",
    marblePrompt:
      "Magnificent emerald green city with towering spires and domes made of green marble and crystal, streets paved with green stone embedded with sparkling emeralds, green glass windows reflecting green light everywhere, ornate green palace in the center, people in green clothing, green tinted atmosphere, magical glowing green light, fantasy fairy tale city, photorealistic, cinematic",
    mapPosition: [50, 55],
    objects: [
      {
        id: "green_spectacles",
        name: "Green Spectacles",
        emoji: "🟢",
        fact: "Colored lenses work by absorbing certain wavelengths of light and only letting their color through. Green glasses absorb red and blue light, so EVERYTHING looks green — even white walls! The Emerald City might not actually be green at all!",
        stemConnection:
          "Color filters selectively absorb and transmit light wavelengths",
        position: [0, 1.2, 0.8],
      },
      {
        id: "emerald_gem",
        name: "Emerald Gem",
        emoji: "💎",
        fact: "Real emeralds get their green color from trace amounts of chromium or vanadium atoms in the crystal structure. They're a variety of the mineral beryl. The green color is caused by these atoms absorbing red light!",
        stemConnection: "Mineral composition determines what color light is absorbed vs reflected",
        position: [1, 0.5, -0.5],
      },
      {
        id: "prism",
        name: "Light Prism",
        emoji: "🔺",
        fact: "White light is actually made up of ALL colors combined! A prism splits white light into a rainbow (spectrum) because each color has a different wavelength and bends at a slightly different angle. Red has the longest wavelength, violet the shortest.",
        stemConnection: "White light = all colors; prisms separate wavelengths by refraction",
        position: [-1, 1.5, 0],
      },
      {
        id: "green_penny",
        name: "Green Penny",
        emoji: "🪙",
        fact: "Copper coins turn green over time due to a chemical reaction called patina (copper + oxygen + water = copper carbonate). The Statue of Liberty is green for the same reason — it's made of copper sheets!",
        stemConnection: "Copper oxidation creates green patina, similar to iron rusting",
        position: [0.5, 0.2, 1.5],
      },
    ],
    quiz: [
      {
        id: "e1",
        question:
          "If you look at a white wall through green glasses, what color does it appear?",
        options: ["White", "Green", "Black", "Rainbow"],
        correctIndex: 1,
        explanation:
          "Green lenses filter out all wavelengths of light except green. Since a white wall reflects ALL colors, the green lens only lets the green portion through — so the wall looks green! That's the secret of the Emerald City.",
      },
      {
        id: "e2",
        question: "What is white light actually made of?",
        options: [
          "Just white color",
          "All colors of the rainbow combined",
          "Only blue and yellow mixed",
          "Invisible light",
        ],
        correctIndex: 1,
        explanation:
          "White light is a combination of all visible wavelengths (colors). A prism proves this by splitting white light into a rainbow — red, orange, yellow, green, blue, indigo, and violet!",
      },
      {
        id: "e3",
        question:
          "Why does the Statue of Liberty look green even though it's made of copper?",
        options: [
          "It was painted green",
          "Copper naturally turns green from oxidation (patina)",
          "Green algae grows on it",
          "It reflects the green ocean water",
        ],
        correctIndex: 1,
        explanation:
          "Copper reacts with oxygen and moisture over time to form copper carbonate — a green coating called patina. It's similar to how iron forms orange rust, but copper forms a green 'rust'!",
      },
      {
        id: "e4",
        question:
          "Which color of visible light has the longest wavelength?",
        options: ["Violet", "Green", "Blue", "Red"],
        correctIndex: 3,
        explanation:
          "Red light has the longest wavelength (~700nm) and violet has the shortest (~400nm). This is why red bends least through a prism and violet bends most — longer waves bend less!",
      },
    ],
    badge: { name: "Light Scientist", emoji: "💡" },
  },

  {
    id: "witch_castle",
    name: "Winkie Country & Witch's Castle",
    chapters: [12, 13, 14],
    quadrant: "west",
    biomeColor: "#F1C40F",
    biomeColorHex: 0xf1c40f,
    stemTopic: "Water Science & Chemistry",
    stemTitle: "Water, States of Matter & Dissolving",
    storySummary:
      "Dorothy is captured by the Wicked Witch of the West and taken to her gloomy castle in the yellow, arid Winkie Country. The Witch fears water above all else. When Dorothy accidentally throws a bucket of water on her, the Witch melts away! Dorothy frees the Winkies and discovers the Golden Cap that controls the Winged Monkeys.",
    scienceIntro:
      "Water is the most important molecule on Earth! Let's explore why the dry Western land struggles, how dissolving works, and the amazing properties of H₂O.",
    splatUrl: "./splats/sensai.spz",
    marblePrompt:
      "Barren yellow desert landscape with cracked dry earth, a dark imposing stone castle on a hill, scattered dead trees and dry scrubland, yellow-tinted dusty atmosphere, winged monkey silhouettes in the orange sky, desolate arid terrain, dry riverbed, dramatic sunset lighting casting long shadows, dark fairy tale atmosphere, photorealistic, cinematic",
    mapPosition: [18, 45],
    objects: [
      {
        id: "water_bucket",
        name: "Bucket of Water",
        emoji: "🪣",
        fact: "Water (H₂O) is called the 'universal solvent' because it can dissolve more substances than any other liquid. In the story, water 'dissolves' the Witch! In real science, water breaks apart molecules by surrounding them with its polar charges.",
        stemConnection:
          "Water's polarity makes it an exceptional solvent",
        position: [0, 0.3, 0.8],
      },
      {
        id: "golden_cap",
        name: "Golden Cap",
        emoji: "👑",
        fact: "Gold is special because it almost NEVER reacts with other chemicals — it doesn't rust, tarnish, or dissolve in water. That's why ancient gold artifacts still shine after thousands of years! Gold is one of the least reactive elements.",
        stemConnection: "Noble metals resist chemical reactions (low reactivity)",
        position: [-0.8, 1, -0.3],
      },
      {
        id: "dry_earth",
        name: "Cracked Dry Earth",
        emoji: "🏜️",
        fact: "When soil loses all its water, the clay particles shrink and pull apart, creating cracks. Deserts get less than 10 inches of rain per year. The Winkie Country's yellow, dry landscape is like a real arid biome — harsh and difficult for life.",
        stemConnection: "Water scarcity shapes desert biome landscapes",
        position: [1, 0.1, -1],
      },
      {
        id: "ice_crystal",
        name: "Water States",
        emoji: "❄️",
        fact: "Water exists in three states: solid (ice, below 0°C), liquid (water, 0-100°C), and gas (steam, above 100°C). It's one of the few substances that expands when it freezes — that's why ice floats and pipes can burst in winter!",
        stemConnection: "Phase transitions: solid, liquid, and gas",
        position: [0.5, 1.5, 0.5],
      },
    ],
    quiz: [
      {
        id: "w1",
        question:
          "Which biome is yellow and dry like a desert?",
        options: [
          "Rainforest",
          "Temperate grassland",
          "Arid/desert biome",
          "Tundra",
        ],
        correctIndex: 2,
        explanation:
          "The Winkie Country's yellow, dry landscape represents an arid/desert biome. Deserts receive less than 10 inches of rainfall per year, creating cracked earth and sparse vegetation.",
      },
      {
        id: "w2",
        question: "Why is water called the 'universal solvent'?",
        options: [
          "It's found everywhere on Earth",
          "It can dissolve more substances than any other liquid",
          "It's always clear",
          "It never freezes",
        ],
        correctIndex: 1,
        explanation:
          "Water's molecular polarity (slightly positive on one end, slightly negative on the other) lets it pull apart and surround the molecules of many substances, dissolving them. That's why the Witch 'dissolves'!",
      },
      {
        id: "w3",
        question:
          "Why doesn't gold rust or tarnish like iron?",
        options: [
          "Gold is too heavy",
          "Gold is a noble metal with very low chemical reactivity",
          "Gold is always kept indoors",
          "Gold absorbs oxygen instead of reacting",
        ],
        correctIndex: 1,
        explanation:
          "Gold is a 'noble metal' — its electrons are arranged in a way that makes it extremely resistant to chemical reactions. It won't react with oxygen or water, unlike iron which readily rusts!",
      },
      {
        id: "w4",
        question: "What are the three states of water?",
        options: [
          "Hot, warm, cold",
          "Solid (ice), liquid (water), gas (steam)",
          "Fresh, salt, sparkling",
          "Rain, river, ocean",
        ],
        correctIndex: 1,
        explanation:
          "All matter exists in states: solid, liquid, and gas. Water freezes to ice at 0°C and boils to steam at 100°C. It's one of the few substances that expands when it freezes!",
      },
    ],
    badge: { name: "Water Chemist", emoji: "💧" },
  },

  {
    id: "china_country",
    name: "China Country & Fighting Trees",
    chapters: [18, 19, 20],
    quadrant: "south",
    biomeColor: "#E67E22",
    biomeColorHex: 0xe67e22,
    stemTopic: "Materials & Engineering",
    stemTitle: "Ceramics, Strength & Fragility",
    storySummary:
      "Journeying south, Dorothy and her friends face angry Fighting Trees that swing their branches like clubs! Beyond them, they discover a magical country where everything — houses, animals, people — is made of delicate, living china. The china people beg them to be careful, for they crack and break so easily.",
    scienceIntro:
      "Why do some materials shatter while others bend? Let's explore ceramics, elasticity, and how engineers choose the right material for each job!",
    splatUrl: "./splats/sensai.spz",
    marblePrompt:
      "Magical miniature village made entirely of delicate white and painted porcelain, tiny china houses with colorful roofs, porcelain figurines of people and animals on a smooth white ground, pastel colors, a low white wall surrounding the village, twisted dark fighting trees at the border, warm soft lighting, fairy tale miniature atmosphere, photorealistic, tilt-shift effect",
    mapPosition: [50, 78],
    objects: [
      {
        id: "china_figure",
        name: "China Princess",
        emoji: "👸",
        fact: "Porcelain (china) is made from a special clay called kaolin, fired at extremely high temperatures (1,200-1,400°C). This process called vitrification makes it very hard but also very BRITTLE — it can't bend without breaking!",
        stemConnection: "Ceramics: hard but brittle due to crystal structure",
        position: [0, 0.5, 0],
      },
      {
        id: "rubber_ball",
        name: "Flexible Branch",
        emoji: "🌿",
        fact: "Wood is flexible because it's made of long cellulose fibers that can bend and spring back. This is called ELASTICITY. The Fighting Trees use this property — their branches bend back and snap forward like whips!",
        stemConnection: "Elasticity: materials that deform and spring back",
        position: [-1.2, 1.2, -0.5],
      },
      {
        id: "cracked_plate",
        name: "Cracked China Plate",
        emoji: "🍽️",
        fact: "When a ceramic object cracks, the break travels along the crystal boundaries in the material. Unlike metal (which bends) or rubber (which stretches), ceramics have no way to absorb impact energy — so they shatter!",
        stemConnection: "Brittle fracture: energy travels through rigid crystal lattice",
        position: [1, 0.2, 0.8],
      },
      {
        id: "kiln",
        name: "Potter's Kiln",
        emoji: "🔥",
        fact: "A kiln fires clay at temperatures hot enough to chemically transform it. Below 600°C, clay can still dissolve in water. Above 1,000°C, the particles fuse together permanently — that's why fired pottery is waterproof and hard!",
        stemConnection: "Heat transforms material properties irreversibly",
        position: [0.5, 0.8, -1],
      },
    ],
    quiz: [
      {
        id: "c1",
        question:
          "Why does a china plate shatter when dropped but a rubber ball bounces?",
        options: [
          "China is heavier",
          "China is brittle (can't absorb impact), rubber is elastic (flexes and springs back)",
          "China is colder",
          "Rubber is made of stronger atoms",
        ],
        correctIndex: 1,
        explanation:
          "Ceramics like china are BRITTLE — their rigid crystal structure can't flex to absorb energy, so they crack. Rubber is ELASTIC — its long molecular chains stretch and spring back, absorbing the impact!",
      },
      {
        id: "c2",
        question: "At what temperature does clay become permanently hard pottery?",
        options: [
          "100°C (boiling water)",
          "About 1,000-1,400°C in a kiln",
          "0°C (freezing)",
          "Room temperature, just wait long enough",
        ],
        correctIndex: 1,
        explanation:
          "Clay must be heated to over 1,000°C for the particles to permanently fuse together (vitrification). This is an irreversible chemical change — you can never turn pottery back into soft clay!",
      },
      {
        id: "c3",
        question: "What property lets tree branches bend without breaking?",
        options: ["Brittleness", "Magnetism", "Elasticity", "Transparency"],
        correctIndex: 2,
        explanation:
          "Elasticity is the ability of a material to deform under stress and return to its original shape. Wood's cellulose fibers give it this flexibility — that's how the Fighting Trees swing their branches!",
      },
      {
        id: "c4",
        question:
          "Which of these materials is a ceramic?",
        options: ["Rubber tire", "Steel beam", "Porcelain teacup", "Cotton shirt"],
        correctIndex: 2,
        explanation:
          "Porcelain is a ceramic — made from clay fired at high temperatures. Ceramics are inorganic, non-metallic materials that are hard and heat-resistant but tend to be brittle.",
      },
    ],
    badge: { name: "Master Engineer", emoji: "⚙️" },
  },

  {
    id: "glinda_castle",
    name: "Quadling Country & Glinda's Castle",
    chapters: [21, 22, 23, 24],
    quadrant: "south",
    biomeColor: "#E74C3C",
    biomeColorHex: 0xe74c3c,
    stemTopic: "Geography & Geology",
    stemTitle: "Rocks, Mountains & Landforms",
    storySummary:
      "Dorothy journeys through the rocky, red Quadling Country of the South. The Lion becomes King of Beasts by defeating a giant spider. They finally reach Glinda the Good Witch's beautiful castle. Glinda reveals the Silver Shoes could have taken Dorothy home all along — she just had to click her heels three times!",
    scienceIntro:
      "The red, rocky southern land is full of geological wonders. Let's explore how mountains form, what makes rocks red, and how the Earth shapes its own surface!",
    splatUrl: "./splats/sensai.spz",
    marblePrompt:
      "Beautiful red rocky landscape with plateaus and cliff formations, red sandstone mesas and buttes, a magnificent pink and white castle with crystal towers in the distance, red wildflowers and red-leaved trees, warm golden red sunset lighting, dramatic cloud formations, red earth path leading to the castle, fairy tale meets desert canyon geology, photorealistic, cinematic",
    mapPosition: [50, 88],
    objects: [
      {
        id: "red_cliff",
        name: "Red Sandstone Cliff",
        emoji: "🏔️",
        fact: "Red rocks get their color from iron oxide (the same rust that affects the Tin Woodman!). When iron minerals in rock are exposed to oxygen over millions of years, they turn red. Places like the Grand Canyon and Sedona are red for this reason.",
        stemConnection: "Iron oxide in sedimentary rock creates red landscapes",
        position: [-1, 1, -1],
      },
      {
        id: "plateau",
        name: "Mesa/Plateau",
        emoji: "⛰️",
        fact: "A mesa is a flat-topped hill with steep sides, formed when hard rock on top protects softer rock below from eroding away. Over millions of years, the surrounding soft rock wears away, leaving the mesa standing tall!",
        stemConnection: "Differential erosion creates dramatic flat-topped landforms",
        position: [1.5, 1.5, 0],
      },
      {
        id: "fossil",
        name: "Ancient Fossil",
        emoji: "🦴",
        fact: "Fossils form when organisms are buried in sediment that slowly turns to rock. The red rocky landscapes of the Quadling Country would be full of fossils! Sedimentary rocks like sandstone are the best places to find them.",
        stemConnection: "Sedimentation preserves ancient life as fossils in rock layers",
        position: [0, 0.2, 1],
      },
      {
        id: "crystal",
        name: "Crystal Formation",
        emoji: "✨",
        fact: "Crystals form when molecules arrange themselves in a repeating 3D pattern. Glinda's crystal castle isn't just fantasy — real crystals like quartz, amethyst, and diamond form deep underground under extreme heat and pressure over thousands of years!",
        stemConnection: "Crystal lattice structures form under specific temperature and pressure",
        position: [0.8, 0.8, -0.8],
      },
    ],
    quiz: [
      {
        id: "g1",
        question: "Why are some rocks and landscapes red?",
        options: [
          "They're painted by volcanoes",
          "Iron oxide (rust) in the rock turns it red over millions of years",
          "Red sunlight stains them",
          "They contain rubies",
        ],
        correctIndex: 1,
        explanation:
          "Just like the Tin Woodman rusts orange-brown, iron minerals in rock react with oxygen to form iron oxide, which is red! The Grand Canyon, Mars, and the Quadling Country are all red for this reason.",
      },
      {
        id: "g2",
        question: "How does a mesa (flat-topped mountain) form?",
        options: [
          "Volcanoes push flat rocks up",
          "Hard rock on top protects soft rock below from erosion",
          "Glaciers carve them flat",
          "Wind blows the tops off mountains",
        ],
        correctIndex: 1,
        explanation:
          "A mesa forms through differential erosion: a cap of hard rock resists weathering while softer surrounding rock erodes away over millions of years, leaving a dramatic flat-topped formation.",
      },
      {
        id: "g3",
        question: "Which type of rock is most likely to contain fossils?",
        options: [
          "Igneous (volcanic) rock",
          "Metamorphic rock",
          "Sedimentary rock (like sandstone)",
          "Metallic ore",
        ],
        correctIndex: 2,
        explanation:
          "Sedimentary rocks form from layers of sand, mud, and organic material settling over time. Organisms buried in these layers can be preserved as fossils. Sandstone and limestone are fossil treasure troves!",
      },
      {
        id: "g4",
        question: "What conditions are needed to form crystals deep underground?",
        options: [
          "Cold temperatures and no pressure",
          "Extreme heat and pressure over long time periods",
          "Lots of water and sunlight",
          "Strong winds and erosion",
        ],
        correctIndex: 1,
        explanation:
          "Crystals form when extreme heat and pressure force molecules into repeating geometric patterns. Deep underground, temperatures can exceed 1,000°C and pressure is enormous — perfect crystal-growing conditions!",
      },
    ],
    badge: { name: "Geologist", emoji: "🪨" },
  },
];

export function getWorldById(id: string): OzWorld | undefined {
  return OZ_WORLDS.find((w) => w.id === id);
}

export function getProgress(): { worldId: string; stars: number; completed: boolean }[] {
  const raw = localStorage.getItem("oz_progress");
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function saveWorldProgress(worldId: string, stars: number) {
  const progress = getProgress();
  const existing = progress.find((p) => p.worldId === worldId);
  if (existing) {
    existing.stars = Math.max(existing.stars, stars);
    existing.completed = true;
  } else {
    progress.push({ worldId, stars, completed: true });
  }
  localStorage.setItem("oz_progress", JSON.stringify(progress));
}

export function isWorldUnlocked(worldId: string): boolean {
  if (worldId === "kansas") return true;
  const idx = OZ_WORLDS.findIndex((w) => w.id === worldId);
  if (idx <= 0) return true;
  const prevWorld = OZ_WORLDS[idx - 1];
  const progress = getProgress();
  return progress.some((p) => p.worldId === prevWorld.id && p.completed);
}

export function getTotalStars(): number {
  return getProgress().reduce((sum, p) => sum + p.stars, 0);
}

export function getCompletedBadges(): { name: string; emoji: string }[] {
  const progress = getProgress();
  return OZ_WORLDS.filter((w) =>
    progress.some((p) => p.worldId === w.id && p.completed)
  ).map((w) => w.badge);
}
