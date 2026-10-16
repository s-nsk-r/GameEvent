// Phase Courier - Main Game Loop (Strictly AGENTS.md Compliant)

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    // States: 'TITLE', 'PLAYING', 'WHISPER', 'GAMEOVER', 'VICTORY'
    this.state = 'TITLE';

    this.world = new WorldMap();
    this.camera = new Camera(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.camera.setWorldBounds(this.world.width, this.world.height);

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

    // Rule 2: Ignore Z for the first 1.0 second of game-over screen
    this.gameOverTimer = 0;

    // Animation Loop
    requestAnimationFrame((t) => this.loop(t));
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

  triggerGameOver() {
    this.state = 'GAMEOVER';
    this.gameOverTimer = 60; // 1.0 second (60 frames) lockout per Rule 2
    window.soundEngine.playDeath();
  }

  checkWorldInteractions() {
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + this.player.h / 2;

    // 1. Region detection
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
      if (dist < 36 && !beacon.active) {
        beacon.active = true;
        this.player.setRespawn(beacon);
        window.soundEngine.playLevelComplete();
        const color = (this.player.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
        window.particleSystem.addShockwave(beacon.x, beacon.y, color);
        window.particleSystem.emit(beacon.x, beacon.y, color, 30, 4, 35);
      }
    }

    // 3. Spirit Shards
    for (let shard of this.world.shards) {
      if (!shard.collected) {
        const dist = Math.hypot(px - shard.x, py - shard.y);
        if (dist < 24) {
          shard.collected = true;
          this.shardsCollected++;
          window.soundEngine.playJump();
          window.particleSystem.emit(shard.x, shard.y, '#ffffff', 16, 3, 20);
        }
      }
    }

    // 4. Memory Whispers (Activated with Down Arrow)
    for (let whisper of this.world.whispers) {
      const dist = Math.hypot(px - whisper.x, py - whisper.y);
      if (dist < 32) {
        if (window.inputController.justPressed.down) {
          this.openWhisper(whisper);
          return;
        }
      }
    }

    // 5. Final Chrono-Nexus Altar
    const altar = this.world.altar;
    if (px >= altar.x && px <= altar.x + altar.w && py >= altar.y && py <= altar.y + altar.h) {
      this.state = 'VICTORY';
      this.gameOverTimer = 60; // 1 second lockout before accepting restart
      window.soundEngine.playLevelComplete();
      window.particleSystem.addShockwave(altar.x + altar.w / 2, altar.y + altar.h / 2, '#ffffff');
    }
  }

  update() {
    const input = window.inputController;
    input.update();

    if (this.state === 'TITLE') {
      // Rule 4: "The game launches straight to a title screen showing 'Press Z to start'."
      // Rule 2: Screen changes need a FRESH press of Z
      if (input.isZJustPressed()) {
        input.consumeZ();
        window.soundEngine.ensureContext();
        this.state = 'PLAYING';
        this.startTime = performance.now();
        window.soundEngine.playJump();
      }
    } else if (this.state === 'PLAYING') {
      this.elapsedTime = performance.now() - this.startTime;

      const readyToRespawn = this.player.update(input, this.world);
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

      // Rule 1: Confirm / close always uses Z
      if (input.isZJustPressed()) {
        input.consumeZ();
        this.closeWhisper();
      }
    } else if (this.state === 'GAMEOVER' || this.state === 'VICTORY') {
      // Rule 2: Ignore Z for the first 1 second of the game-over screen
      if (this.gameOverTimer > 0) {
        this.gameOverTimer--;
      } else {
        // Rule 4: "Game over shows the score and 'Press Z to play again'. Restarting needs no other key."
        if (input.isZJustPressed()) {
          input.consumeZ();
          this.restart();
        }
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const renderOffset = this.camera.getRenderOffsets();

    // 1. Draw Parallax Backgrounds
    this.drawParallax(renderOffset);

    // 2. Draw World Tiles
    this.drawWorldTiles(renderOffset);

    // 3. Draw World Entities (Beacons, Shards, Lanterns, Altar)
    this.drawEntities(renderOffset);

    // 4. Draw Particles
    window.particleSystem.draw(this.ctx, this.player.dimension, renderOffset);

    // 5. Draw Player
    if (this.state !== 'TITLE' && this.state !== 'VICTORY' && this.state !== 'GAMEOVER') {
      this.player.draw(this.ctx, renderOffset);
    }

    // 6. Lighting Veil
    this.drawBioluminescentLightVeil(renderOffset);

    // 7. Screens & Overlays
    if (this.state === 'TITLE') {
      this.drawTitleScreen();
    } else if (this.state === 'PLAYING') {
      this.drawHUD();
    } else if (this.state === 'WHISPER') {
      this.drawHUD();
      this.drawWhisperModal();
    } else if (this.state === 'GAMEOVER') {
      this.drawGameOverScreen();
    } else if (this.state === 'VICTORY') {
      this.drawVictoryScreen();
    }
  }

  drawParallax(offset) {
    const dim = this.player.dimension;
    const grad = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    if (dim === 'SOLAR') {
      grad.addColorStop(0, '#16110a');
      grad.addColorStop(0.5, '#22170e');
      grad.addColorStop(1, '#110c08');
    } else {
      grad.addColorStop(0, '#060f1b');
      grad.addColorStop(0.5, '#0a1d30');
      grad.addColorStop(1, '#040b12');
    }
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Far Celestial Glow (0.15x parallax)
    const farX = -(offset.x * 0.15) % 640;
    this.ctx.fillStyle = (dim === 'SOLAR') ? 'rgba(255, 179, 0, 0.08)' : 'rgba(0, 229, 255, 0.08)';
    this.ctx.beginPath();
    this.ctx.arc(CANVAS_WIDTH * 0.72 + farX * 0.5, 90, 85, 0, Math.PI * 2);
    this.ctx.fill();

    // Distant mountain ridges
    this.ctx.fillStyle = (dim === 'SOLAR') ? 'rgba(42, 28, 18, 0.7)' : 'rgba(12, 28, 46, 0.7)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, CANVAS_HEIGHT);
    for (let x = 0; x <= CANVAS_WIDTH + 40; x += 40) {
      const worldX = x - farX;
      const h = Math.sin(worldX * 0.008) * 45 + 160;
      this.ctx.lineTo(x, CANVAS_HEIGHT - h);
    }
    this.ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.fill();

    // Midground Spirit Trees (0.45x parallax)
    const midX = -(offset.x * 0.45) % 640;
    this.ctx.fillStyle = (dim === 'SOLAR') ? 'rgba(32, 22, 15, 0.85)' : 'rgba(8, 20, 34, 0.85)';
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
          // Universal solid stone / wood
          this.ctx.fillStyle = '#222b38';
          this.ctx.fillRect(sx, sy, 20, 20);
          this.ctx.strokeStyle = '#37474f';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(sx + 0.5, sy + 0.5, 19, 19);

          if (this.world.getTile(c, r - 1) === 0) {
            this.ctx.fillStyle = (dim === 'SOLAR') ? '#ffb300' : '#00e5ff';
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
            this.ctx.shadowBlur = 0;
          } else {
            // Hazard laser
            const pulse = Math.sin(now * 3 + c * 0.5) * 0.3 + 0.7;
            this.ctx.fillStyle = `rgba(255, 143, 0, ${pulse * 0.3})`;
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
            this.ctx.shadowBlur = 0;
          } else {
            // Hazard laser
            const pulse = Math.sin(now * 3 + c * 0.5) * 0.3 + 0.7;
            this.ctx.fillStyle = `rgba(0, 176, 255, ${pulse * 0.3})`;
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
          // Thorns
          this.ctx.fillStyle = '#ff1744';
          this.ctx.shadowColor = '#ff1744';
          this.ctx.shadowBlur = 4;
          for (let i = 0; i < 4; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(sx + i * 5, sy + 20);
            this.ctx.lineTo(sx + i * 5 + 2.5, sy + 7);
            this.ctx.lineTo(sx + (i + 1) * 5, sy + 20);
            this.ctx.fill();
          }
          this.ctx.shadowBlur = 0;
        }
      }
    }
  }

  drawEntities(offset) {
    const now = performance.now() * 0.005;
    const dim = this.player.dimension;

    // Beacons (Checkpoints)
    for (let beacon of this.world.beacons) {
      const sx = Math.floor(beacon.x - offset.x);
      const sy = Math.floor(beacon.y - offset.y);
      if (sx < -40 || sx > CANVAS_WIDTH + 40 || sy < -40 || sy > CANVAS_HEIGHT + 40) continue;

      const activeColor = beacon.active ? ((dim === 'SOLAR') ? '#ffb300' : '#00e5ff') : '#455a64';
      this.ctx.fillStyle = '#263238';
      this.ctx.fillRect(sx - 8, sy - 25, 16, 30);

      this.ctx.save();
      this.ctx.fillStyle = activeColor;
      this.ctx.shadowColor = activeColor;
      this.ctx.shadowBlur = beacon.active ? 16 : 0;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy - 28 + Math.sin(now * 3) * 2, beacon.active ? 6 : 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Lanterns (Mid-air dash resets)
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
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy + floatY, lantern.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Shards
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
      this.ctx.arc(sx, sy + floatY, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Whispers
    for (let whisper of this.world.whispers) {
      const sx = Math.floor(whisper.x - offset.x);
      const sy = Math.floor(whisper.y - offset.y);
      if (sx < -30 || sx > CANVAS_WIDTH + 30 || sy < -30 || sy > CANVAS_HEIGHT + 30) continue;

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

    // Chrono-Nexus Altar
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
    const px = Math.floor(this.player.x + this.player.w / 2 - offset.x);
    const py = Math.floor(this.player.y + this.player.h / 2 - offset.y);
    const dim = this.player.dimension;

    this.ctx.save();
    const lightGrad = this.ctx.createRadialGradient(px, py, 12, px, py, 150);
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
    // Rule 4: High-contrast, large text readable from 2 meters
    this.ctx.font = 'bold 14px "Share Tech Mono", monospace';
    this.ctx.fillStyle = '#ffffff';

    // Sector Name
    this.ctx.textAlign = 'left';
    this.ctx.fillText(this.currentRegionName, 18, 24);

    // Speedrun Timer & Deaths
    const totalSecs = Math.floor(this.elapsedTime / 1000);
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');

    this.ctx.textAlign = 'center';
    this.ctx.fillText(`TIME: ${mins}:${secs}  |  💀 ${this.totalDeaths}`, CANVAS_WIDTH / 2, 24);

    // Shards
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`💎 ${this.shardsCollected}/20`, CANVAS_WIDTH - 18, 24);

    // Bottom Dimension indicator & Phase readiness
    const dim = this.player.dimension;
    const canPhase = (this.player.phaseCooldown <= 0);
    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 12px "Share Tech Mono", monospace';
    if (dim === 'SOLAR') {
      this.ctx.fillStyle = '#ffb300';
      this.ctx.fillText("DIMENSION: [SOLAR // GOLD]  •  PRESS Z TO CHANGE", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    } else {
      this.ctx.fillStyle = '#00e5ff';
      this.ctx.fillText("DIMENSION: [VOID // CYAN]  •  PRESS Z TO CHANGE", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    }

    this.ctx.restore();
  }

  drawWhisperModal() {
    if (!this.activeWhisper) return;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(6, 10, 16, 0.92)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const mx = 60;
    const my = 40;
    const mw = CANVAS_WIDTH - 120;
    const mh = CANVAS_HEIGHT - 80;

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
    this.ctx.font = 'bold 16px "Chakra Petch", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`// ${this.activeWhisper.title}`, mx + 20, my + 32);

    this.ctx.strokeStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.moveTo(mx + 20, my + 46);
    this.ctx.lineTo(mx + mw - 20, my + 46);
    this.ctx.stroke();

    // Body
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px "Share Tech Mono", monospace';
    const textToShow = this.activeWhisper.text.substring(0, this.whisperTextIndex);
    this.wrapText(textToShow, mx + 20, my + 76, mw - 40, 22);

    // Rule 1: Confirm / close always uses Z
    this.ctx.fillStyle = '#ffb300';
    this.ctx.font = 'bold 13px "Share Tech Mono", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("PRESS [Z] TO CLOSE ARCHIVE", CANVAS_WIDTH / 2, my + mh - 18);

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
    this.ctx.fillStyle = 'rgba(4, 7, 12, 0.95)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Rule 4: Large, high contrast text readable from 2 meters
    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 40px "Chakra Petch", sans-serif';
    this.ctx.fillStyle = '#ffb300';
    this.ctx.shadowColor = '#ffb300';
    this.ctx.shadowBlur = 24;
    this.ctx.fillText("PHASE COURIER", CANVAS_WIDTH / 2, 95);

    this.ctx.font = 'bold 18px "Share Tech Mono", monospace';
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.shadowColor = '#00e5ff';
    this.ctx.shadowBlur = 14;
    this.ctx.fillText("WILL OF THE CONTINUUM", CANVAS_WIDTH / 2, 130);
    this.ctx.shadowBlur = 0;

    // Rule 4: Title screen shows "Press Z to start"
    const pulse = (Math.sin(performance.now() * 0.005) + 1) * 0.5;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.6})`;
    this.ctx.font = 'bold 22px "Share Tech Mono", monospace';
    this.ctx.fillText("PRESS Z TO START", CANVAS_WIDTH / 2, 195);

    // Rule 4: On-screen text shows controls on title screen
    this.ctx.fillStyle = '#b0bec5';
    this.ctx.font = '14px "Share Tech Mono", monospace';
    this.ctx.fillText("CONTROLS:", CANVAS_WIDTH / 2, 245);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText("LEFT / RIGHT ARROWS : MOVE", CANVAS_WIDTH / 2, 270);
    this.ctx.fillText("SPACE : JUMP / GLIDE", CANVAS_WIDTH / 2, 292);
    this.ctx.fillText("Z : CHANGE DIMENSION / START", CANVAS_WIDTH / 2, 314);

    this.ctx.restore();
  }

  drawGameOverScreen() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(6, 4, 8, 0.96)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 36px "Chakra Petch", sans-serif';
    this.ctx.fillStyle = '#ff1744';
    this.ctx.shadowColor = '#ff1744';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText("FRACTURE COLLAPSE", CANVAS_WIDTH / 2, 100);

    // Rule 4: Game over shows the score and "Press Z to play again"
    const totalSecs = Math.floor(this.elapsedTime / 1000);
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px "Share Tech Mono", monospace';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText(`TIME: ${mins}:${secs}  |  SHARDS: ${this.shardsCollected}/20`, CANVAS_WIDTH / 2, 160);

    if (this.gameOverTimer > 0) {
      this.ctx.fillStyle = '#78909c';
      this.ctx.font = '14px "Share Tech Mono", monospace';
      this.ctx.fillText("RECALIBRATING RESONANCE...", CANVAS_WIDTH / 2, 230);
    } else {
      const pulse = (Math.sin(performance.now() * 0.006) + 1) * 0.5;
      this.ctx.fillStyle = `rgba(0, 229, 255, ${0.4 + pulse * 0.6})`;
      this.ctx.font = 'bold 20px "Share Tech Mono", monospace';
      this.ctx.fillText("PRESS Z TO PLAY AGAIN", CANVAS_WIDTH / 2, 230);
    }

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

    this.ctx.font = '15px "Share Tech Mono", monospace';
    this.ctx.fillStyle = '#ffb300';
    this.ctx.shadowColor = '#ffb300';
    this.ctx.shadowBlur = 8;
    this.ctx.fillText("TWO WORLDS MERGED BENEATH A SINGLE LIVING SKY.", CANVAS_WIDTH / 2, 115);
    this.ctx.shadowBlur = 0;

    const totalSecs = Math.floor(this.elapsedTime / 1000);
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 17px "Share Tech Mono", monospace';
    this.ctx.fillText(`TOTAL TIME: ${mins}:${secs}`, CANVAS_WIDTH / 2, 165);
    this.ctx.fillText(`DEATH COUNT: ${this.totalDeaths}`, CANVAS_WIDTH / 2, 195);
    this.ctx.fillText(`SPIRIT SHARDS: ${this.shardsCollected} / 20`, CANVAS_WIDTH / 2, 225);

    if (this.gameOverTimer > 0) {
      this.ctx.fillStyle = '#78909c';
      this.ctx.font = '14px "Share Tech Mono", monospace';
      this.ctx.fillText("NEXUS HARMONIZING...", CANVAS_WIDTH / 2, 280);
    } else {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 18px "Share Tech Mono", monospace';
      this.ctx.fillText("PRESS Z TO PLAY AGAIN", CANVAS_WIDTH / 2, 280);
    }

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
