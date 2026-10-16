// Phase Courier - Seamless Open World ("The Fractured Canopy & Depths")
// Dimensions: 200 tiles wide x 60 tiles high = 4000px x 1200px
// Tile Legend:
// 0: Air
// 1: Neutral Organic Stone / Tree Trunk (Solid in both dimensions)
// 2: Solar Gold Crystal / Root (Solid in Solar, ghost preview in Crimson)
// 3: Crimson Obsidian Mushroom / Crystal (Solid in Crimson, ghost preview in Solar)
// 4: Thorn Spikes (Lethal in both dimensions)
// 5: Solar Kinetic Spring
// 6: Crimson Kinetic Spring

class WorldMap {
  constructor() {
    this.cols = 200;
    this.rows = 60;
    this.tileSize = 20;
    this.width = this.cols * this.tileSize;   // 4000px
    this.height = this.rows * this.tileSize; // 1200px

    this.tiles = new Uint8Array(this.cols * this.rows);

    // Entity lists
    this.beacons = [];
    this.shards = [];
    this.lanterns = [];
    this.whispers = [];
    this.altar = { x: 3740, y: 640, w: 60, h: 40 };

    this.buildTerrain();
    this.populateEntities();
  }

  getTile(c, r) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return 1; // Outer boundaries are solid
    return this.tiles[r * this.cols + c];
  }

  setTile(c, r, val) {
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      this.tiles[r * this.cols + c] = val;
    }
  }

  fillBox(x1, y1, x2, y2, val) {
    for (let r = y1; r <= y2; r++) {
      for (let c = x1; c <= x2; c++) {
        this.setTile(c, r, val);
      }
    }
  }

  buildTerrain() {
    // 1. Solid Outer Border
    this.fillBox(0, 0, this.cols - 1, 1, 1);
    this.fillBox(0, this.rows - 2, this.cols - 1, this.rows - 1, 1);
    this.fillBox(0, 0, 1, this.rows - 1, 1);
    this.fillBox(this.cols - 2, 0, this.cols - 1, this.rows - 1, 1);

    // ========================================================
    // REGION 1: THE SUNLIT CANOPY (Cols 0 - 55, Rows 15 - 32)
    // Starting meadow and rolling tree plateaus
    // ========================================================
    // Ground floor of meadow
    this.fillBox(2, 22, 25, 26, 1);
    this.fillBox(10, 18, 16, 21, 1); // Step hill

    // Gap over a small valley
    this.fillBox(30, 22, 50, 26, 1);
    // Floating branches for jump training
    this.fillBox(24, 17, 28, 17, 1);
    this.fillBox(35, 16, 40, 16, 1);
    this.fillBox(45, 14, 49, 14, 1);

    // First gentle dimensional bridge (Gold and Cyan crystals)
    this.fillBox(52, 18, 56, 18, 2); // Gold crystal bridge
    this.fillBox(58, 20, 64, 20, 3); // Cyan crystal bridge

    // Ground beneath the rift descent
    this.fillBox(50, 28, 70, 32, 1);

    // ========================================================
    // REGION 2: THE WHISPERING RIFT (Cols 65 - 120, Rows 10 - 45)
    // Vertical drop, alternating wall climbs, and air-dash gates
    // ========================================================
    // Upper plateau
    this.fillBox(65, 14, 75, 14, 1);

    // Vertical descent shaft (Deep chasms with alternating walls)
    this.fillBox(70, 34, 74, 35, 1); // Beacon 2 resting ledge
    this.fillBox(75, 10, 77, 38, 1); // Left spine
    this.fillBox(88, 10, 90, 38, 1); // Right spine

    // Alternating crystal climb panels in the shaft
    this.fillBox(78, 18, 78, 24, 2); // Gold wall
    this.fillBox(87, 22, 87, 28, 3); // Cyan wall
    this.fillBox(78, 28, 78, 34, 2); // Gold wall
    this.fillBox(87, 32, 87, 37, 3); // Cyan wall

    // Spike hazard floor under the first drop
    this.fillBox(78, 38, 86, 38, 4);

    // Horizontal exit corridor from shaft
    this.fillBox(91, 35, 115, 37, 1);
    this.fillBox(91, 28, 115, 29, 1); // Ceiling

    // Phase Dash Gauntlet (Alternating laser barriers)
    this.fillBox(98, 30, 98, 34, 2);  // Gold laser/solid
    this.fillBox(105, 30, 105, 34, 3); // Cyan laser/solid
    this.fillBox(112, 30, 112, 34, 2); // Gold laser/solid

    // Wide Ravine with mid-air floating lanterns
    this.fillBox(118, 38, 140, 42, 1); // Far floor
    this.fillBox(122, 32, 126, 32, 2); // Floating gold platform
    this.fillBox(130, 30, 134, 30, 3); // Floating cyan platform

    // ========================================================
    // REGION 3: THE LUMINESCENT DEPTHS (Cols 135 - 175, Rows 35 - 55)
    // Deep crystal caverns, kinetic springs, water pools & thorns
    // ========================================================
    // Subterranean floor
    this.fillBox(138, 48, 175, 54, 1);
    // Deep thorn pits
    this.fillBox(145, 47, 153, 47, 4);
    this.fillBox(160, 47, 168, 47, 4);

    // Kinetic launch springpads
    this.setTile(143, 47, 5); // Solar Spring
    this.setTile(156, 47, 6); // Void Spring

    // High ceiling arches with wall-climb ridges
    this.fillBox(144, 38, 145, 43, 3); // Cyan wall
    this.fillBox(157, 36, 158, 41, 2); // Gold wall

    // High floating cavern ledge
    this.fillBox(169, 42, 178, 44, 1);

    // Giant vertical root climb into the Sanctuary
    this.fillBox(178, 25, 180, 52, 1); // Great Trunk
    this.fillBox(177, 45, 177, 48, 2); // Gold wall grips
    this.fillBox(177, 37, 177, 41, 3); // Cyan wall grips
    this.fillBox(177, 29, 177, 33, 2); // Gold wall grips

    // ========================================================
    // REGION 4: THE ANCESTRAL CHRONO-NEXUS (Cols 180 - 198, Rows 25 - 45)
    // The Great Spirit Tree & Convergence Sanctuary
    // ========================================================
    // Sacred ground
    this.fillBox(180, 40, 197, 48, 1);
    // Tree steps up to Altar
    this.fillBox(184, 38, 196, 39, 1);
    this.fillBox(186, 36, 194, 37, 1);
    // Altar pedestal
    this.fillBox(187, 34, 190, 35, 1);
  }

  populateEntities() {
    // 1. Spirit Beacons (Checkpoints)
    this.beacons = [
      { id: 1, x: 280, y: 440, name: "SUNLIT OUTLOOK", active: true },
      { id: 2, x: 1440, y: 680, name: "RIFT CANYON", active: false },
      { id: 3, x: 2780, y: 940, name: "BIOLUMINESCENT DEPTHS", active: false },
      { id: 4, x: 3620, y: 780, name: "ANCESTRAL SANCTUARY", active: false }
    ];

    // 2. Spirit Lanterns (Mid-Air Dash & Jump Resets)
    this.lanterns = [
      { x: 1220, y: 380, radius: 14, timer: 0 },
      { x: 1380, y: 460, radius: 14, timer: 0 },
      { x: 2160, y: 580, radius: 14, timer: 0 },
      { x: 2420, y: 620, radius: 14, timer: 0 },
      { x: 3040, y: 840, radius: 14, timer: 0 },
      { x: 3260, y: 780, radius: 14, timer: 0 }
    ];

    // 3. Collectible Spirit Shards (20 Light Orbs)
    const shardCoords = [
      [240, 380], [480, 290], [680, 270], [860, 240], [1080, 360],
      [1180, 320], [1560, 460], [1680, 520], [1780, 600], [1980, 680],
      [2120, 620], [2300, 560], [2600, 720], [2880, 920], [3140, 800],
      [3380, 860], [3480, 760], [3540, 680], [3680, 700], [3740, 640]
    ];
    this.shards = shardCoords.map((pos, idx) => ({
      id: idx,
      x: pos[0],
      y: pos[1],
      collected: false,
      pulse: Math.random() * Math.PI * 2
    }));

    // 4. Memory Whispers (Ancient Tablets)
    this.whispers = [
      {
        id: 1,
        x: 820,
        y: 400,
        title: "WHISPER I: THE SEVERED CRADLE",
        text: "Before the desync, the sun and moon shared the exact same sky.\nA mother's lullaby in the Dawn realm echoed as birdsong in the Dusk realm.\nCross the rift, little light. Reunite the song."
      },
      {
        id: 2,
        x: 1820,
        y: 560,
        title: "WHISPER II: THE TWIN SPECTRA",
        text: "Two astronomers pointed their telescopes at the exact same point in the dark.\nOne saw a dying star; the other saw a newborn sun.\nTogether, their light forms the pulse of Continuum-9."
      },
      {
        id: 3,
        x: 3380,
        y: 840,
        title: "WHISPER III: THE BUILDERS' PRAYER",
        text: "Liam and Althea stood on opposite sides of an invisible pane of glass.\nThey could not touch, so they breathed their last spark of warmth into P-04.\n'Go,' they said. 'Bring our worlds back into each other's arms.'"
      }
    ];
  }
}

window.WorldMap = WorldMap;
