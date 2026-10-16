// Phase Courier - Seamless Open-World Game Loop (Ori and the Will of the Wisps Inspired)

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    // States: 'TITLE', 'PLAYING', 'WHISPER', 'VICTORY'
    this.state = 'TITLE';

    this.world = new WorldMap();
    this.camera = new Camera(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.camera.setWorldBounds(this.world.width, this.world.height);

    // Initial spawn point
    this.player = new Player(180, 410);
    this.player.setRespawn(this.world.beacons[0]);
    this.camera.snapTo(this.player.x, this.player.y);

    // Metrics & Collections
    this.startTime = 0;
    this.elapsedTime = 0;
    this.totalDeaths = 0;
    this.shardsCollected = 0;
    this.whispersRead = new Set();
    this.currentRegionName = "THE SUNLIT CANOPY";

    // Dialog State
    this.activeWhisper = null;
    this.whisperTextIndex = 0;

    // Inputs
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      jumpHold: false,
      jumpPressed: false,
      downPressed: false
    };

    this.setupInputs();

    // Start Animation Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      window.soundEngine.ensureContext();

      if (e.code === 'ArrowLeft') this.keys.left = true;
      if (e.code === 'ArrowRight') this.keys.right = true;
      if (e.code === 'ArrowUp') this.keys.up = true;
      if (e.code === 'ArrowDown') {
        this.keys.down = true;
        this.keys.downPressed = true;
      }

      if (e.code === 'Space') {
        if (!this.keys.jumpHold) {
          this.keys.jumpPressed = true;
        }
        this.keys.jumpHold = true;

        if (this.state === 'TITLE') {
          this.state = 'PLAYING';
          this.startTime = performance.now();
          window.soundEngine.playJump();
        } else if (this.state === 'WHISPER') {
          this.closeWhisper();
        } else if (this.state === 'VICTORY') {
          this.restart();
        }
      }

      if (e.code === 'KeyZ') {
        if (this.state === 'PLAYING') {
          this.player.phaseDash(this.keys);
          this.camera.shake(3.5);
        }
      }

      if (e.code === 'KeyR') {
        if (this.state === 'PLAYING') {
          this.player.respawn();
          this.camera.snapTo(this.player.x, this.player.y);
        }
      }

      if (e.code === 'KeyM') {
        window.soundEngine.toggleMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft') this.keys.left = false;
      if (e.code === 'ArrowRight') this.keys.right = false;
      if (e.code === 'ArrowUp') this.keys.up = false;
      if (e.code === 'ArrowDown') this.keys.down = false;
      if (e.code === 'Space') this.keys.jumpHold = false;
    });
  }

  restart() {
    this.totalDeaths = 0;
    this.shardsCollected = 0;
    this.whispersRead.clear();
    this.world = new WorldMap();
    this.player = new Player(180, 410);
    this.player.setRespawn(this.world.beacons[0]);
    this.camera.snapTo(this.player.x, this.player.y);
    this.state = 'PLAYING';
    this.startTime = performance.now();
  }

  openWhisper(whisper) {
    this.state = 'WHISPER';
    this.activeWhisper = whisper;
    this.whisperTextIndex = 0;
    this.whispersRead.add(whisper.id);
    window.soundEngine.playTerminalBlip();
  }

  closeWhisper() {
    this.state = 'PLAYING';
    this.activeWhisper = null;
    window.soundEngine.playJump();
  }

  checkWorldInteractions() {
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + this.player.h / 2;

    // 1. Region detection based on X coordinates
    if (px < 1300) {
      this.currentRegionName = "THE SUNLIT CANOPY";
    } else if (px < 2500) {
      this.currentRegionName = "THE WHISPERING RIFT";
    } else if (px < 3400) {
      this.currentRegionName = "THE BIOLUMINESCENT DEPTHS";
    } else {
      this.currentRegionName = "THE CHRONO-NEXUS";
    }

    // 2. Spirit Beacons (Checkpoints)
    for (let beacon of this.world.beacons) {
      const dist = Math.hypot(px - beacon.x, py - beacon.y);
      if (dist < 32 && !beacon.active) {
        beacon.active = true;
        this.player.setRespawn(beacon);
        window.soundEngine.playLevelComplete();
        const color = (this.player.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
        window.particleSystem.addShockwave(beacon.x, beacon.y, color);
        window.particleSystem.emit(beacon.x, beacon.y, color, 30, 4, 35);
      }
    }

    // 3. Spirit Shards (Collectibles)
    for (let shard of this.world.shards) {
      if (!shard.collected) {
        const dist = Math.hypot(px - shard.x, py - shard.y);
        if (dist < 22) {
          shard.collected = true;
          this.shardsCollected++;
          window.soundEngine.playJump();
          window.particleSystem.emit(shard.x, shard.y, '#ffffff', 16, 3, 20);
        }
      }
    }

    // 4. Memory Whispers (Story Tablets)
    for (let whisper of this.world.whispers) {
      const dist = Math.hypot(px - whisper.x, py - whisper.y);
      if (dist < 30) {
        if (this.keys.downPressed || this.keys.jumpPressed) {
          this.openWhisper(whisper);
          return;
        }
      }
    }

    // 5. Final Chrono-Nexus Altar
    const altar = this.world.altar;
    if (px >= altar.x && px <= altar.x + altar.w && py >= altar.y && py <= altar.y + altar.h) {
      this.state = 'VICTORY';
      window.soundEngine.playLevelComplete();
      window.particleSystem.addShockwave(altar.x + altar.w / 2, altar.y + altar.h / 2, '#ffffff');
    }
  }

  update() {
    if (this.state === 'PLAYING') {
      this.elapsedTime = performance.now() - this.startTime;

      const readyToRespawn = this.player.update(this.keys, this.world);
      if (readyToRespawn) {
        this.totalDeaths++;
        this.player.respawn();
        this.camera.snapTo(this.player.x, this.player.y);
      }

      if (!this.player.isDead) {
        this.checkWorldInteractions();
      }

      this.camera.update(this.player);
      window.particleSystem.update(this.player.dimension);
    } else if (this.state === 'WHISPER') {
      if (this.activeWhisper && this.whisperTextIndex < this.activeWhisper.text.length) {
        this.whisperTextIndex += 2;
        if (Math.random() > 0.6) window.soundEngine.playTerminalBlip();
      }
    }

    this.keys.jumpPressed = false;
    this.keys.downPressed = false;
  }

  draw() {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const renderOffset = this.camera.getRenderOffsets();

    // 1. Draw Parallax Backgrounds (Ori atmospheric silhouette layers)
    this.drawParallax(renderOffset);

    // 2. Draw World Tiles
    this.drawWorldTiles(renderOffset);

    // 3. Draw World Entities (Beacons, Shards, Lanterns, Altar)
    this.drawEntities(renderOffset);

    // 4. Draw Particles (World space & Screen space)
    window.particleSystem.draw(this.ctx, this.player.dimension, renderOffset);

    // 5. Draw Player
    if (this.state !== 'TITLE' && this.state !== 'VICTORY') {
      this.player.draw(this.ctx, renderOffset);
    }

    // 6. Bioluminescent Lighting Veil (Ori Glowing bloom effect)
    this.drawBioluminescentLightVeil(renderOffset);

    // 7. Draw HUD or Overlays
    if (this.state === 'TITLE') {
      this.drawTitleScreen();
    } else if (this.state === 'PLAYING') {
      this.drawHUD();
    } else if (this.state === 'WHISPER') {
      this.drawHUD();
      this.drawWhisperModal();
    } else if (this.state === 'VICTORY') {
      this.drawVictoryScreen();
    }
  }

  drawParallax(offset) {
    const dim = this.player.dimension;

    // Atmospheric deep backdrop gradient
    const grad = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    if (dim === 'SOLAR') {
      grad.addColorStop(0, '#120d09');
      grad.addColorStop(0.5, '#1e140d');
      grad.addColorStop(1, '#0e0a07');
    } else {
      grad.addColorStop(0, '#040b14');
      grad.addColorStop(0.5, '#071524');
      grad.addColorStop(1, '#03080e');
    }
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Far Distant Mountains & Massive Spirit Trees (0.15x parallax)
    const farX = -(offset.x * 0.15) % 640;
    this.ctx.fillStyle = (dim === 'SOLAR') ? 'rgba(255, 179, 0, 0.05)' : 'rgba(0, 229, 255, 0.05)';
    this.ctx.beginPath();
    this.ctx.arc(CANVAS_WIDTH * 0.75 + farX * 0.5, 90, 80, 0, Math.PI * 2); // Celestial celestial moon/sun
    this.ctx.fill();

    // Distant mountain ridges
    this.ctx.fillStyle = (dim === 'SOLAR') ? 'rgba(38, 26, 17, 0.7)' : 'rgba(10, 24, 40, 0.7)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, CANVAS_HEIGHT);
    for (let x = 0; x <= CANVAS_WIDTH + 40; x += 40) {
      const worldX = x - farX;
      const h = Math.sin(worldX * 0.008) * 45 + 160;
      this.ctx.lineTo(x, CANVAS_HEIGHT - h);
    }
    this.ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.fill();

    // Midground Spirit Trees & Hanging Vines (0.45x parallax)
    const midX = -(offset.x * 0.45) % 640;
    this.ctx.fillStyle = (dim === 'SOLAR') ? 'rgba(28, 20, 14, 0.85)' : 'rgba(7, 18, 30, 0.85)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, CANVAS_HEIGHT);
    for (let x = 0; x <= CANVAS_WIDTH + 30; x += 30) {
      const worldX = x - midX;
      const h = Math.sin(worldX * 0.015) * 35 + 90;
      this.ctx.lineTo(x, CANVAS_HEIGHT - h);
    }
    this.ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.fill();
  }

  drawWorldTiles(offset) {
    const startCol = Math.max(0, Math.floor(offset.x / this.world.tileSize));
    const endCol = Math.min(this.world.cols - 1, Math.ceil((offset.x + CANVAS_WIDTH) / this.world.tileSize));
    const startRow = Math.max(0, Math.floor(offset.y / this.world.tileSize));
    const endRow = Math.min(this.world.rows - 1, Math.ceil((offset.y + CANVAS_HEIGHT) / this.world.tileSize));

    const dim = this.player.dimension;
    const now = performance.now() * 0.005;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const tile = this.world.getTile(c, r);
        if (tile === 0) continue;

        const sx = Math.floor(c * this.world.tileSize - offset.x);
        const sy = Math.floor(r * this.world.tileSize - offset.y);

        if (tile === 1) {
          // Organic Stone / Ancient Tree Bark
          this.ctx.fillStyle = '#1c2430';
          this.ctx.fillRect(sx, sy, 20, 20);
          this.ctx.strokeStyle = '#2d3b4e';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(sx + 0.5, sy + 0.5, 19, 19);

          // Ethereal moss accent on top edges
          if (this.world.getTile(c, r - 1) === 0) {
            this.ctx.fillStyle = (dim === 'SOLAR') ? '#4e3a1f' : '#14384e';
            this.ctx.fillRect(sx, sy, 20, 3);
          }
        } else if (tile === 2) {
          // Solar Gold Crystal
          if (dim === 'SOLAR') {
            this.ctx.fillStyle = '#ffb300';
            this.ctx.shadowColor = '#ffb300';
            this.ctx.shadowBlur = 6;
            this.ctx.fillRect(sx, sy, 20, 20);
            this.ctx.fillStyle = '#ffe082';
            this.ctx.fillRect(sx + 2, sy + 2, 16, 16);
            this.ctx.fillStyle = '#ff8f00';
            this.ctx.fillRect(sx + 4, sy + 4, 12, 12);
            this.ctx.shadowBlur = 0;
          } else {
            // Lethal Laser Crystal Beam in Void
            const pulse = Math.sin(now * 3 + c * 0.5) * 0.3 + 0.7;
            this.ctx.fillStyle = `rgba(255, 143, 0, ${pulse * 0.25})`;
            this.ctx.fillRect(sx + 2, sy + 2, 16, 16);
            this.ctx.strokeStyle = `rgba(255, 179, 0, ${pulse})`;
            this.ctx.shadowColor = '#ffb300';
            this.ctx.shadowBlur = 8;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(sx + 10, sy);
            this.ctx.lineTo(sx + 10, sy + 20);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
          }
        } else if (tile === 3) {
          // Void Cyan Crystal
          if (dim === 'VOID') {
            this.ctx.fillStyle = '#00e5ff';
            this.ctx.shadowColor = '#00e5ff';
            this.ctx.shadowBlur = 6;
            this.ctx.fillRect(sx, sy, 20, 20);
            this.ctx.fillStyle = '#80d8ff';
            this.ctx.fillRect(sx + 2, sy + 2, 16, 16);
            this.ctx.fillStyle = '#00b0ff';
            this.ctx.fillRect(sx + 4, sy + 4, 12, 12);
            this.ctx.shadowBlur = 0;
          } else {
            // Lethal Laser Crystal Beam in Solar
            const pulse = Math.sin(now * 3 + c * 0.5) * 0.3 + 0.7;
            this.ctx.fillStyle = `rgba(0, 176, 255, ${pulse * 0.25})`;
            this.ctx.fillRect(sx + 2, sy + 2, 16, 16);
            this.ctx.strokeStyle = `rgba(0, 229, 255, ${pulse})`;
            this.ctx.shadowColor = '#00e5ff';
            this.ctx.shadowBlur = 8;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(sx + 10, sy);
            this.ctx.lineTo(sx + 10, sy + 20);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
          }
        } else if (tile === 4) {
          // Thorn Brambles (Universal Hazard)
          this.ctx.fillStyle = '#ff1744';
          this.ctx.shadowColor = '#ff1744';
          this.ctx.shadowBlur = 4;
          for (let i = 0; i < 4; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(sx + i * 5, sy + 20);
            this.ctx.lineTo(sx + i * 5 + 2.5, sy + 6);
            this.ctx.lineTo(sx + (i + 1) * 5, sy + 20);
            this.ctx.fill();
          }
          this.ctx.shadowBlur = 0;
        } else if (tile === 5 || tile === 6) {
          // Kinetic Springs
          const isSolar = (tile === 5);
          const active = (isSolar && dim === 'SOLAR') || (!isSolar && dim === 'VOID');
          const springColor = isSolar ? '#ffb300' : '#00e5ff';

          this.ctx.fillStyle = active ? springColor : '#37474f';
          this.ctx.fillRect(sx + 2, sy + 14, 16, 6);
          this.ctx.strokeStyle = active ? '#ffffff' : '#263238';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(sx + 4, sy + (active ? 6 : 10), 12, (active ? 8 : 4));
        }
      }
    }
  }

  drawEntities(offset) {
    const now = performance.now() * 0.005;
    const dim = this.player.dimension;

    // 1. Spirit Beacons (Checkpoints)
    for (let beacon of this.world.beacons) {
      const sx = Math.floor(beacon.x - offset.x);
      const sy = Math.floor(beacon.y - offset.y);
      if (sx < -40 || sx > CANVAS_WIDTH + 40 || sy < -40 || sy > CANVAS_HEIGHT + 40) continue;

      const activeColor = beacon.active ? ((dim === 'SOLAR') ? '#ffb300' : '#00e5ff') : '#455a64';

      // Ancient stone obelisk
      this.ctx.fillStyle = '#263238';
      this.ctx.fillRect(sx - 8, sy - 25, 16, 30);

      // Glowing crystal orb at the peak
      this.ctx.save();
      this.ctx.fillStyle = activeColor;
      this.ctx.shadowColor = activeColor;
      this.ctx.shadowBlur = beacon.active ? 16 : 0;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy - 28 + Math.sin(now * 3) * 2, beacon.active ? 6 : 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 2. Spirit Lanterns (Mid-Air Bash Resets)
    for (let lantern of this.world.lanterns) {
      const sx = Math.floor(lantern.x - offset.x);
      const sy = Math.floor(lantern.y - offset.y);
      if (sx < -40 || sx > CANVAS_WIDTH + 40 || sy < -40 || sy > CANVAS_HEIGHT + 40) continue;

      const lColor = (dim === 'SOLAR') ? '#ffe082' : '#80d8ff';
      const floatY = Math.sin(now * 3 + lantern.x) * 4;

      this.ctx.save();
      this.ctx.fillStyle = lColor;
      this.ctx.shadowColor = lColor;
      this.ctx.shadowBlur = 14;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy + floatY, lantern.radius * 0.65, 0, Math.PI * 2);
      this.ctx.fill();

      // Outer golden lantern cage
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy + floatY, lantern.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 3. Spirit Shards (Collectibles)
    for (let shard of this.world.shards) {
      if (shard.collected) continue;
      const sx = Math.floor(shard.x - offset.x);
      const sy = Math.floor(shard.y - offset.y);
      if (sx < -20 || sx > CANVAS_WIDTH + 20 || sy < -20 || sy > CANVAS_HEIGHT + 20) continue;

      const floatY = Math.sin(now * 4 + shard.pulse) * 3;
      this.ctx.save();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = (dim === 'SOLAR') ? '#ffb300' : '#00e5ff';
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy + floatY, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 4. Memory Whispers (Story Tablets)
    for (let whisper of this.world.whispers) {
      const sx = Math.floor(whisper.x - offset.x);
      const sy = Math.floor(whisper.y - offset.y);
      if (sx < -30 || sx > CANVAS_WIDTH + 30 || sy < -30 || sy > CANVAS_HEIGHT + 30) continue;

      const floatY = Math.sin(now * 2.5 + whisper.id) * 3;
      this.ctx.save();
      this.ctx.fillStyle = '#1e2633';
      this.ctx.fillRect(sx - 10, sy - 8, 20, 16);
      this.ctx.strokeStyle = '#00e5ff';
      this.ctx.shadowColor = '#00e5ff';
      this.ctx.shadowBlur = 8;
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(sx - 10, sy - 8, 20, 16);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px "Share Tech Mono"';
      this.ctx.fillText("📜", sx - 5, sy + 4);
      this.ctx.restore();
    }

    // 5. Final Altar (Great Spirit Tree Heart)
    const altar = this.world.altar;
    const asx = Math.floor(altar.x - offset.x);
    const asy = Math.floor(altar.y - offset.y);
    if (asx > -100 && asx < CANVAS_WIDTH + 100) {
      this.ctx.save();
      const aColor = (dim === 'SOLAR') ? '#ffb300' : '#00e5ff';
      this.ctx.strokeStyle = aColor;
      this.ctx.shadowColor = aColor;
      this.ctx.shadowBlur = 24;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(asx, asy, altar.w, altar.h);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 12px "Share Tech Mono"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("CHRONO-NEXUS", asx + altar.w / 2, asy - 12);
      this.ctx.restore();
    }
  }

  drawBioluminescentLightVeil(offset) {
    // Ori-style soft radial illumination in dark areas
    const px = Math.floor(this.player.x + this.player.w / 2 - offset.x);
    const py = Math.floor(this.player.y + this.player.h / 2 - offset.y);
    const dim = this.player.dimension;

    this.ctx.save();
    const lightGrad = this.ctx.createRadialGradient(px, py, 10, px, py, 140);
    const auraColor = (dim === 'SOLAR') ? 'rgba(255, 179, 0, 0.16)' : 'rgba(0, 229, 255, 0.16)';
    lightGrad.addColorStop(0, auraColor);
    lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.fillStyle = lightGrad;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.restore();
  }

  drawHUD() {
    this.ctx.save();
    this.ctx.font = '12px "Share Tech Mono", monospace';
    this.ctx.fillStyle = '#cfd8dc';

    // Current Region Name
    this.ctx.textAlign = 'left';
    this.ctx.fillText(this.currentRegionName, 18, 22);

    // Speedrun Timer & Deaths
    const totalSecs = Math.floor(this.elapsedTime / 1000);
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    const ms = Math.floor((this.elapsedTime % 1000) / 10).toString().padStart(2, '0');

    this.ctx.textAlign = 'center';
    this.ctx.fillText(`TIME: ${mins}:${secs}.${ms}  |  💀 ${this.totalDeaths}`, CANVAS_WIDTH / 2, 22);

    // Shards & Whispers
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`💎 ${this.shardsCollected}/20  |  📜 ${this.whispersRead.size}/3`, CANVAS_WIDTH - 18, 22);

    // Bottom Controls & Ability Guide
    this.ctx.font = '11px "Share Tech Mono", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#90a4ae';
    this.ctx.fillText("SPACE: JUMP / DOUBLE JUMP / GLIDE (HOLD)  |  Z: AIR-DASH & PHASE", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 8);

    this.ctx.restore();
  }

  drawWhisperModal() {
    if (!this.activeWhisper) return;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(6, 10, 16, 0.9)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const mx = 70;
    const my = 45;
    const mw = CANVAS_WIDTH - 140;
    const mh = CANVAS_HEIGHT - 90;

    this.ctx.fillStyle = '#08111a';
    this.ctx.strokeStyle = '#00e5ff';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#00e5ff';
    this.ctx.shadowBlur = 16;
    this.ctx.fillRect(mx, my, mw, mh);
    this.ctx.strokeRect(mx, my, mw, mh);
    this.ctx.shadowBlur = 0;

    // Title
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.font = 'bold 14px "Chakra Petch", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`// ${this.activeWhisper.title}`, mx + 20, my + 30);

    // Separator line
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.moveTo(mx + 20, my + 44);
    this.ctx.lineTo(mx + mw - 20, my + 44);
    this.ctx.stroke();

    // Body
    this.ctx.fillStyle = '#e0f7fa';
    this.ctx.font = '13px "Share Tech Mono", monospace';
    const textToShow = this.activeWhisper.text.substring(0, this.whisperTextIndex);
    this.wrapText(textToShow, mx + 20, my + 72, mw - 40, 20);

    // Prompt
    this.ctx.fillStyle = '#ffb300';
    this.ctx.font = 'bold 12px "Share Tech Mono", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("PRESS [SPACE] TO CONTINUE", CANVAS_WIDTH / 2, my + mh - 16);

    this.ctx.restore();
  }

  wrapText(text, x, y, maxWidth, lineHeight) {
    const paragraphs = text.split('\n');
    let currentY = y;
    for (let para of paragraphs) {
      if (para === '') {
        currentY += lineHeight * 0.7;
        continue;
      }
      const words = para.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = this.ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          this.ctx.fillText(line, x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }
  }

  drawTitleScreen() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(4, 7, 12, 0.94)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 36px "Chakra Petch", sans-serif';
    this.ctx.fillStyle = '#ffb300';
    this.ctx.shadowColor = '#ffb300';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText("PHASE COURIER", CANVAS_WIDTH / 2, 105);

    this.ctx.font = '16px "Share Tech Mono", monospace';
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.shadowColor = '#00e5ff';
    this.ctx.shadowBlur = 12;
    this.ctx.fillText("WILL OF THE CONTINUUM", CANVAS_WIDTH / 2, 135);
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#90a4ae';
    this.ctx.font = '13px "Share Tech Mono", monospace';
    this.ctx.fillText("A seamless journey through a shattered reality.", CANVAS_WIDTH / 2, 180);
    this.ctx.fillText("Glide on the wind. Dash across dimensions.", CANVAS_WIDTH / 2, 202);

    const pulse = (Math.sin(performance.now() * 0.005) + 1) * 0.5;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.6})`;
    this.ctx.font = 'bold 15px "Share Tech Mono", monospace';
    this.ctx.fillText("PRESS [SPACE] TO BEGIN", CANVAS_WIDTH / 2, 260);

    this.ctx.fillStyle = '#546e7a';
    this.ctx.font = '11px "Share Tech Mono", monospace';
    this.ctx.fillText("ARROWS: MOVE  |  SPACE: JUMP/GLIDE  |  Z: PHASE DASH", CANVAS_WIDTH / 2, 310);

    this.ctx.restore();
  }

  drawVictoryScreen() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(4, 8, 14, 0.96)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 34px "Chakra Petch", sans-serif';
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.shadowColor = '#00e5ff';
    this.ctx.shadowBlur = 22;
    this.ctx.fillText("THE ANCESTRAL DAWN RESTORED", CANVAS_WIDTH / 2, 85);

    this.ctx.font = '14px "Share Tech Mono", monospace';
    this.ctx.fillStyle = '#ffb300';
    this.ctx.shadowColor = '#ffb300';
    this.ctx.shadowBlur = 8;
    this.ctx.fillText("TWO WORLDS MERGED BENEATH A SINGLE LIVING SKY.", CANVAS_WIDTH / 2, 115);
    this.ctx.shadowBlur = 0;

    const totalSecs = Math.floor(this.elapsedTime / 1000);
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');

    this.ctx.fillStyle = '#eceff1';
    this.ctx.font = '16px "Share Tech Mono", monospace';
    this.ctx.fillText(`TOTAL TIME: ${mins}:${secs}`, CANVAS_WIDTH / 2, 165);
    this.ctx.fillText(`DEATH COUNT: ${this.totalDeaths}`, CANVAS_WIDTH / 2, 195);
    this.ctx.fillText(`SPIRIT SHARDS: ${this.shardsCollected} / 20`, CANVAS_WIDTH / 2, 225);
    this.ctx.fillText(`ANCIENT WHISPERS: ${this.whispersRead.size} / 3`, CANVAS_WIDTH / 2, 255);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px "Share Tech Mono", monospace';
    this.ctx.fillText("PRESS [SPACE] TO JOURNEY AGAIN", CANVAS_WIDTH / 2, 310);

    this.ctx.restore();
  }

  loop(timestamp) {
    this.update();
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
