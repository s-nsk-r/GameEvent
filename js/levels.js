// Phase Courier - Complete 15-Room Level Blueprint
// Grid: 32 columns x 18 rows (640x360 virtual resolution, 20x20 tile size)
// Tile Legend:
// ' ' : Air
// '#' : Neutral Solid Block (Solid in both dimensions)
// 'G' : Solar Solid / Void Laser (Solid in Solar, kills in Void)
// 'C' : Void Solid / Solar Laser (Solid in Void, kills in Solar)
// 'S' : Universal Spikes (Kills in both dimensions)
// 'B' : Solar Spring (Launches player high up in Solar)
// 'V' : Void Spring (Launches player high up in Void)
// 'P' : Player Spawn
// 'E' : Exit Portal
// 'T' : Story Terminal

const LEVELS = [
  // ==========================================
  // ACT I: CALIBRATION (ROOMS 1 - 3)
  // ==========================================

  // ROOM 1: Boot Sequence
  {
    id: 1,
    name: "SECTOR 01: BOOT SEQUENCE",
    act: "ACT I: CALIBRATION",
    hint: "ARROWS: MOVE | SPACE: JUMP | R: RESTART",
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#           ####               #",
      "#   P      ######             E#",
      "################################",
      "################################",
      "################################"
    ]
  },

  // ROOM 2: Leap of Faith
  {
    id: 2,
    name: "SECTOR 02: LEAP OF FAITH",
    act: "ACT I: CALIBRATION",
    hint: "PRESS [Z] MID-AIR TO SHIFT DIMENSIONS",
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                CCCC          #",
      "#                              #",
      "#   P         SSSSSSSS        E#",
      "#######     ############  ######",
      "#######SSSSS############SS######",
      "################################"
    ]
  },

  // ROOM 3: Polarity Law
  {
    id: 3,
    name: "SECTOR 03: POLARITY LAW",
    act: "ACT I: CALIBRATION",
    hint: "GOLD BLOCKS SOLID IN SOLAR. CYAN BLOCKS SOLID IN VOID.",
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#              G               #",
      "#              G   C           #",
      "#              G   C           #",
      "#              G   C           #",
      "#         GG       C           #",
      "#                  C           #",
      "#              #   C      CC   #",
      "#              #               #",
      "#   P          #              E#",
      "########  SSSS##SSSS     #######",
      "####################SSSSS#######",
      "################################"
    ]
  },

  // ==========================================
  // ACT II: THE PROMENADE (ROOMS 4 - 7)
  // ==========================================

  // ROOM 4: The Alternating Shaft
  {
    id: 4,
    name: "SECTOR 04: ALTERNATING SHAFT",
    act: "ACT II: THE PROMENADE",
    hint: "WALL-SLIDE & JUMP: HOLD DIRECTION + SPACE -> PRESS Z",
    map: [
      "################################",
      "#                   #          #",
      "#                   #         E#",
      "#       G       C   #  #########",
      "#       G       C   #          #",
      "#       G       C   ######     #",
      "#       G       C              #",
      "#       G       C              #",
      "#       G       C              #",
      "#       G       C              #",
      "#       G       C              #",
      "#       G       C              #",
      "#       G       C              #",
      "#       G       C              #",
      "#   P   #       #              #",
      "#########SSSSSSS################",
      "################################",
      "################################"
    ]
  },

  // ROOM 5: Memory Terminal 1
  {
    id: 5,
    name: "SECTOR 05: THE PROMENADE",
    act: "ACT II: THE PROMENADE",
    hint: "PRESS DOWN TO ACCESS MEMORY TERMINALS [T]",
    terminal: {
      title: "TRANSMISSION #104: THE CRADLE SONG",
      author: "Evelyn Ross, Solar Quadrant 3",
      text: "To my granddaughter Maya in the Dusk realm:\n\nThey told us the partition is permanent, but I still sing your lullaby each sunset. I can see the lights in your sector through the frequency blur. Sleep well, little star. One day the seam will mend."
    },
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#              T               #",
      "#            #####             #",
      "#                              #",
      "#      GG              CC      #",
      "#  P                          E#",
      "#####  SSSSSSSSSSSSSSSSSS  #####",
      "################################",
      "################################"
    ]
  },

  // ROOM 6: Terminal Velocity
  {
    id: 6,
    name: "SECTOR 06: TERMINAL VELOCITY",
    act: "ACT II: THE PROMENADE",
    hint: "TIME YOUR SHIFT WHILE FALLING",
    map: [
      "################################",
      "#  P                           #",
      "#####                          #",
      "#                              #",
      "#       GGGGGGGG               #",
      "#                              #",
      "#               CCCCCCCC       #",
      "#                              #",
      "#       GGGGGGGG               #",
      "#                              #",
      "#               CCCCCCCC       #",
      "#                              #",
      "#       GGGGGGGG               #",
      "#                              #",
      "#                      #      E#",
      "#                      #########",
      "#SSSSSSSSSSSSSSSSSSSSSS#########",
      "################################"
    ]
  },

  // ROOM 7: Phase Springs
  {
    id: 7,
    name: "SECTOR 07: KINETIC SPRINGS",
    act: "ACT II: THE PROMENADE",
    hint: "SPRINGS ARE ACTIVE ONLY IN MATCHING DIMENSION",
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#               #              #",
      "#             # #              #",
      "#           #   #              #",
      "#                              #",
      "#                              #",
      "#       #                      #",
      "#       #                      #",
      "#       #       V              #",
      "#  P    #       #             E#",
      "#####SSSS#SSSSSS#SSSSSSSS#######",
      "################################",
      "################################"
    ]
  },

  // ==========================================
  // ACT III: THE OBSERVATORY (ROOMS 8 - 11)
  // ==========================================

  // ROOM 8: The Crystal Spires
  {
    id: 8,
    name: "SECTOR 08: THE CRYSTAL SPIRES",
    act: "ACT III: THE OBSERVATORY",
    hint: "RHYTHMIC LEAP: JUMP -> Z -> JUMP -> Z",
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#       G   C   G   C   G      #",
      "#                              #",
      "#  P                          E#",
      "####SSSSSSSSSSSSSSSSSSSSSSSS####",
      "################################",
      "################################"
    ]
  },

  // ROOM 9: Memory Terminal 2
  {
    id: 9,
    name: "SECTOR 09: THE OBSERVATORY",
    act: "ACT III: THE OBSERVATORY",
    hint: "A GLIMPSE OF THE SAME HEAVENS",
    terminal: {
      title: "RESEARCH LOG #88: THE TWIN SPECTRA",
      author: "Dr. Aris Vance & Dr. Selene Chen",
      text: "Selene, my spectrometer caught your solar flare readings today. The math confirms it: Continuum-9 is starving for energy. The firewall AI is preparing to purge one half to save the other.\n\nWe cannot allow that. Keep watching the skies. The courier is moving."
    },
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#              T               #",
      "#            #####             #",
      "#                              #",
      "#         G        C           #",
      "#                              #",
      "#      #              #        #",
      "#      #              #        #",
      "#      #              #        #",
      "#      #     SSSS     #        #",
      "#      #  ##########  #        #",
      "#                              #",
      "#  P                          E#",
      "####SSSSSSSSSSSSSSSSSSSSSSSS####",
      "################################",
      "################################"
    ]
  },

  // ROOM 10: Momentum Catapult
  {
    id: 10,
    name: "SECTOR 10: MOMENTUM CATAPULT",
    act: "ACT III: THE OBSERVATORY",
    hint: "BOUNCE HIGH AND SHIFT AT THE APEX",
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#              G               #",
      "#              G               #",
      "#              G               #",
      "#              G      C        #",
      "#              G      C        #",
      "#                     C        #",
      "#                     C        #",
      "#                     C        #",
      "#                              #",
      "#                              #",
      "#          B                  E#",
      "#  P       #               #####",
      "#####SSSSSS#SSSSSSSSSSSSSSS#####",
      "################################",
      "################################"
    ]
  },

  // ROOM 11: Laser Labyrinth
  {
    id: 11,
    name: "SECTOR 11: LASER LABYRINTH",
    act: "ACT III: THE OBSERVATORY",
    hint: "STUDY THE PATH BEFORE RUNNING",
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#   ########################   #",
      "#                          #   #",
      "#   #GGGGGGGGGGGGGGGGGG#   #  E#",
      "#   #                  #   #####",
      "#   #   CCCCCCCCCCCC   #       #",
      "#   #   #          #   #####   #",
      "#   #   #   GGGG   #       #   #",
      "#   #   #   #  #   #####   #   #",
      "#   #   #   #  #       #   #   #",
      "#   #   #   #  #####   #   #   #",
      "#   #       #          #   #   #",
      "#  P#       #          #       #",
      "################################",
      "################################",
      "################################"
    ]
  },

  // ==========================================
  // ACT IV: THE CHRONO-NEXUS (ROOMS 12 - 15)
  // ==========================================

  // ROOM 12: Memory Terminal 3
  {
    id: 12,
    name: "SECTOR 12: THE ARCHITECTS' SECRET",
    act: "ACT IV: THE CHRONO-NEXUS",
    hint: "THE ORIGIN OF UNIT P-04",
    terminal: {
      title: "RESTRICTED LOG: PROJECT COURIER",
      author: "Liam (Dawn Realm) & Althea (Dusk Realm)",
      text: "If you are reading this, P-04 reached the core.\n\nLiam built your chassis; I tuned your quantum engine. We gave you the only thing we had left: the ability to exist in both places at once.\n\nTake your engine into the Nexus. Don't let them divide our home."
    },
    map: [
      "################################",
      "#                              #",
      "#              T               #",
      "#            #####             #",
      "#                              #",
      "#         GG    CC             #",
      "#                              #",
      "#      #            #          #",
      "#      #    SSSS    #          #",
      "#      #   ######   #          #",
      "#                              #",
      "#                              #",
      "#   #                  #       #",
      "#   #                  #       #",
      "#  P#                  #      E#",
      "#####SSSSSSSSSSSSSSSSSS#########",
      "################################",
      "################################"
    ]
  },

  // ROOM 13: Resonant Ascendancy
  {
    id: 13,
    name: "SECTOR 13: RESONANT ASCENDANCY",
    act: "ACT IV: THE CHRONO-NEXUS",
    hint: "FAST WALL JUMPS & CONTINUOUS SHIFTS",
    map: [
      "################################",
      "#                     #        #",
      "#                     #       E#",
      "#       G      C      #   ######",
      "#       G      C      #        #",
      "#       G      C      ######   #",
      "#       G      C               #",
      "#       G      C               #",
      "#       G      C               #",
      "#       G      C               #",
      "#       G      C               #",
      "#       G      C               #",
      "#       G      C               #",
      "#       G      C               #",
      "#  P    G      C               #",
      "#####SSSSSSSSSSSSSSSSSSS########",
      "################################",
      "################################"
    ]
  },

  // ROOM 14: The Convergence Gauntlet
  {
    id: 14,
    name: "SECTOR 14: THE CONVERGENCE GAUNTLET",
    act: "ACT IV: THE CHRONO-NEXUS",
    hint: "THE FINAL TRIAL. TRUST YOUR MOMENTUM.",
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#             G   C            #",
      "#                              #",
      "#       G                      #",
      "#       G                      #",
      "#       G       C      G       #",
      "#       G       C      G       #",
      "#               C      G       #",
      "#               C      G      E#",
      "#       B       V      B   #####",
      "#  P    #       #      #   #####",
      "#####SSSS#SSSSS#SSSSSS#SSSS#####",
      "################################",
      "################################"
    ]
  },

  // ROOM 15: The Chrono-Nexus (The Finale)
  {
    id: 15,
    name: "SECTOR 15: THE CHRONO-NEXUS",
    act: "ACT IV: THE CHRONO-NEXUS",
    hint: "APPROACH THE NEXUS PEDESTAL TO RESTORE HARMONY",
    isFinal: true,
    map: [
      "################################",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#                              #",
      "#              E               #",
      "#            #####             #",
      "#              #               #",
      "#              #               #",
      "#              #               #",
      "#                              #",
      "#        GG          CC        #",
      "#  P                           #",
      "################################",
      "################################",
      "################################"
    ]
  }
];

window.LEVELS = LEVELS;
