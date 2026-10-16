// Phase Courier - Physics & Player Engine (Strictly AGENTS.md Compliant)
// Snappy Ori-inspired movement, Space Jump, Z Dimension Shift, forgiving mechanics.

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 18; // Generous player size (readable from 2 meters)
    this.h = 24;

    this.vx = 0;
    this.vy = 0;

    // Snappy, graceful movement tuning (Ori feel)
    this.runSpeed = 3.2;
    this.accel = 0.55;
    this.decel = 0.65;
    this.gravity = 0.27;
    this.maxFallSpeed = 5.2;
    this.floatFallSpeed = 1.3;
    this.floatGravity = 0.08;
    this.jumpForce = -6.0;
    this.doubleJumpForce = -5.4;

    // Dimension State: 'SOLAR' (Gold) or 'CRIMSON' (Red/Black)
    this.dimension = 'SOLAR';

    // Jump tracking (via Space Key)
    this.grounded = false;
    this.coyoteTime = 0;
    this.maxCoyote = 8; // Generous coyote grace (Rule 3)
    this.jumpBuffer = 0;
    this.maxJumpBuffer = 7;
    this.jumpsLeft = 2;

    // Wall interaction
    this.onWall = 0;
    this.wallSlideSpeed = 1.2;
    this.wallJumpLockout = 0;

    this.facing = 1;

    // Forgiving Hazard Reaction (Rule 3: >= 1s warning before respawn)
    this.hazardWarningTimer = 0;
    this.invulnerableTimer = 0;

    // Squash & Stretch
    this.scaleX = 1.0;
    this.scaleY = 1.0;

    this.isDead = false;
    this.deathTimer = 0;
    this.trail = [];
    this.respawnBeacon = null;
  }

  setRespawn(beacon) {
    this.respawnBeacon = beacon;
  }

  respawn() {
    if (this.respawnBeacon) {
      this.x = this.respawnBeacon.x - this.w / 2;
      this.y = this.respawnBeacon.y - this.h - 8;
    } else {
      this.x = 240;
      this.y = 410;
    }
    this.vx = 0;
    this.vy = 0;
    this.isDead = false;
    this.deathTimer = 0;
    this.jumpsLeft = 2;
    this.hazardWarningTimer = 0;
    this.invulnerableTimer = 60; // 1s grace on respawn
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.trail = [];
  }

  triggerDimensionPhase() {
    if (this.isDead) return;

    // Toggle dimension: SOLAR (Amber Gold) <-> CRIMSON (Obsidian Red/Black)
    this.dimension = (this.dimension === 'SOLAR') ? 'CRIMSON' : 'SOLAR';

    // Springy squash & stretch pulse on shift
    this.scaleX = 1.35;
    this.scaleY = 0.72;

    if (window.soundEngine) {
      window.soundEngine.setDimension(this.dimension);
      window.soundEngine.playPhase(this.dimension);
    }

    const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#ff1e42';
    if (window.particleSystem) {
      window.particleSystem.addShockwave(this.x + this.w / 2, this.y + this.h / 2, color);
      window.particleSystem.emit(this.x + this.w / 2, this.y + this.h / 2, color, 22, 3.5, 25);
    }
  }

  isTileSolid(tile) {
    if (tile === 1) return true; // Universal stone/wood
    if (this.dimension === 'SOLAR' && (tile === 2 || tile === 5)) return true;   // Solar Gold solid / Spring pad
    if (this.dimension === 'CRIMSON' && (tile === 3 || tile === 6)) return true; // Crimson Obsidian solid / Spring pad
    // Inactive dimension platforms (tile 2 in Crimson or tile 3 in Solar) are permeable ghost previews!
    return false;
  }

  isTileHazard(tile) {
    // Only dedicated thorns are hazards. Inactive platforms are ghost previews, never hazards!
    return tile === 4;
  }

  checkSolidIntersection(testx, testy, world) {
    const leftCol = Math.floor(testx / world.tileSize);
    const rightCol = Math.floor((testx + this.w - 0.01) / world.tileSize);
    const topRow = Math.floor(testy / world.tileSize);
    const bottomRow = Math.floor((testy + this.h - 0.01) / world.tileSize);

    for (let r = topRow; r <= bottomRow; r++) {
      for (let c = leftCol; c <= rightCol; c++) {
        const tile = world.getTile(c, r);
        if (this.isTileSolid(tile)) return true;
      }
    }
    return false;
  }

  checkHazardIntersection(world) {
    // Generous, forgiving hitbox (Rule 3)
    const hx = this.x + 4;
    const hy = this.y + 4;
    const hw = this.w - 8;
    const hh = this.h - 8;

    const leftCol = Math.floor(hx / world.tileSize);
    const rightCol = Math.floor((hx + hw) / world.tileSize);
    const topRow = Math.floor(hy / world.tileSize);
    const bottomRow = Math.floor((hy + hh) / world.tileSize);

    for (let r = topRow; r <= bottomRow; r++) {
      for (let c = leftCol; c <= rightCol; c++) {
        const tile = world.getTile(c, r);
        if (this.isTileHazard(tile)) return true;
      }
    }
    return false;
  }

  checkLanterns(world) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    for (let lantern of world.lanterns) {
      const dist = Math.hypot(cx - lantern.x, cy - lantern.y);
      if (dist < lantern.radius + 16 && lantern.timer <= 0) {
        this.jumpsLeft = 2;
        this.vy = -5.0; // Spring bounce
        this.scaleX = 0.7;
        this.scaleY = 1.4;
        lantern.timer = 50;
        if (window.soundEngine) window.soundEngine.playSpring();
        const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#ff1e42';
        if (window.particleSystem) window.particleSystem.addShockwave(lantern.x, lantern.y, color);
      }
      if (lantern.timer > 0) lantern.timer--;
    }
  }

  triggerHazardWarning() {
    if (this.invulnerableTimer > 0) return;

    // Rule 3: Forgiving reaction window. Bounce player upward and warn for 1.1s
    this.hazardWarningTimer = 65;
    this.invulnerableTimer = 90;
    this.vy = -4.2;
    this.vx = -this.facing * 2.2;

    if (window.soundEngine) window.soundEngine.playDeath();
    if (window.particleSystem) {
      window.particleSystem.emit(this.x + this.w / 2, this.y + this.h / 2, '#ff1744', 16, 2.5, 30);
    }
  }

  kill() {
    if (this.isDead) return;
    this.isDead = true;
    this.deathTimer = 25;
    if (window.soundEngine) window.soundEngine.playDeath();
    const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#ff1e42';
    if (window.particleSystem) {
      window.particleSystem.emitDeathExplosion(this.x + this.w / 2, this.y + this.h / 2, color);
    }
  }

  update(input, world) {
    if (this.isDead) {
      this.deathTimer--;
      return this.deathTimer <= 0;
    }

    // Cooldown & invulnerability timers
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    if (this.hazardWarningTimer > 0) this.hazardWarningTimer--;

    // 1. Z Key: Dimension Shift (Solar Gold <-> Crimson Red/Black)
    if (input.isZJustPressed()) {
      input.consumeZ();
      this.triggerDimensionPhase();
    }

    // 2. Jump Buffer on Space Key
    if (input.justPressed.space) {
      this.jumpBuffer = this.maxJumpBuffer;
    } else if (this.jumpBuffer > 0) {
      this.jumpBuffer--;
    }

    if (this.wallJumpLockout > 0) this.wallJumpLockout--;

    // 3. Coyote Time tracking
    if (this.grounded) {
      this.coyoteTime = this.maxCoyote;
      this.jumpsLeft = 2;
    } else if (this.coyoteTime > 0) {
      this.coyoteTime--;
    }

    // 4. Continuous Horizontal Movement on Held Arrow Keys (Rule 2)
    let moveDir = 0;
    if (input.held.left) moveDir -= 1;
    if (input.held.right) moveDir += 1;

    if (moveDir !== 0) {
      this.facing = moveDir;
      if (this.wallJumpLockout === 0) {
        this.vx += moveDir * this.accel;
        if (Math.abs(this.vx) > this.runSpeed) {
          this.vx = moveDir * this.runSpeed;
        }
      }
    } else {
      // Releasing arrow keys stops smoothly (Rule 2)
      if (this.wallJumpLockout === 0) {
        if (Math.abs(this.vx) > this.decel) {
          this.vx -= Math.sign(this.vx) * this.decel;
        } else {
          this.vx = 0;
        }
      }
    }

    // 5. Wall Latch & Slide
    this.onWall = 0;
    const touchingLeft = this.checkSolidIntersection(this.x - 1, this.y, world);
    const touchingRight = this.checkSolidIntersection(this.x + 1, this.y, world);

    if (!this.grounded && (touchingLeft || touchingRight)) {
      this.onWall = touchingLeft ? -1 : 1;
      this.jumpsLeft = 2;

      if (this.vy > this.wallSlideSpeed) {
        this.vy = this.wallSlideSpeed;
      }

      const sparkX = (this.onWall === -1) ? this.x : this.x + this.w;
      const sparkColor = (this.dimension === 'SOLAR') ? '#ffb300' : '#ff1e42';
      if (window.particleSystem) {
        window.particleSystem.emitWallSlideSparks(sparkX, this.y + this.h / 2, this.onWall, sparkColor);
      }
    }

    // 6. Gravity & Feather Float (holding Space while falling slows descent)
    let currentGravity = this.gravity;
    if (!this.grounded && input.held.space && this.vy > 0) {
      if (this.vy > this.floatFallSpeed) {
        this.vy = this.floatFallSpeed;
      }
      currentGravity = this.floatGravity;
    }

    this.vy += currentGravity;
    if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;

    // 7. Jumping with Space (Ground Jump, Wall Leap, Acrobatic Double Jump)
    if (this.jumpBuffer > 0) {
      if (this.coyoteTime > 0) {
        // Ground Jump
        this.vy = this.jumpForce;
        this.grounded = false;
        this.coyoteTime = 0;
        this.jumpBuffer = 0;
        this.jumpsLeft = 1;
        this.scaleX = 0.72;
        this.scaleY = 1.38;
        if (window.soundEngine) window.soundEngine.playJump();
        const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#ff1e42';
        if (window.particleSystem) {
          window.particleSystem.emitJumpDust(this.x + this.w / 2, this.y + this.h, color);
        }
      } else if (this.onWall !== 0) {
        // Wall Leap Kick-off
        this.vy = this.jumpForce * 0.94;
        this.vx = -this.onWall * (this.runSpeed * 1.3);
        this.wallJumpLockout = 9;
        this.jumpBuffer = 0;
        this.jumpsLeft = 1;
        this.scaleX = 0.75;
        this.scaleY = 1.32;
        if (window.soundEngine) window.soundEngine.playWallJump();
      } else if (this.jumpsLeft > 0) {
        // Double Jump (Acrobatic Flip)
        this.vy = this.doubleJumpForce;
        this.jumpBuffer = 0;
        this.jumpsLeft = 0;
        this.scaleX = 1.28;
        this.scaleY = 0.78;
        if (window.soundEngine) window.soundEngine.playWallJump();
        const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#ff1e42';
        if (window.particleSystem) {
          window.particleSystem.addShockwave(this.x + this.w / 2, this.y + this.h / 2, color);
        }
      }
    }

    // Variable jump height: releasing Space early gently dampens ascent
    if (!input.held.space && this.vy < -1.6) {
      this.vy *= 0.52;
    }

    // 8. Apply Horizontal Velocity & Collision Resolution
    this.x += this.vx;
    if (this.vx > 0) {
      if (this.checkSolidIntersection(this.x, this.y, world)) {
        this.x = Math.floor((this.x + this.w) / world.tileSize) * world.tileSize - this.w;
        this.vx = 0;
      }
    } else if (this.vx < 0) {
      if (this.checkSolidIntersection(this.x, this.y, world)) {
        this.x = Math.floor(this.x / world.tileSize) * world.tileSize + world.tileSize;
        this.vx = 0;
      }
    }

    // 9. Apply Vertical Velocity & Collision Resolution
    this.y += this.vy;
    const wasGrounded = this.grounded;
    this.grounded = false;

    if (this.vy > 0) {
      if (this.checkSolidIntersection(this.x, this.y, world)) {
        this.y = Math.floor((this.y + this.h) / world.tileSize) * world.tileSize - this.h;
        this.vy = 0;
        this.grounded = true;

        // Check if landing on an active kinetic spring (tile 5 in SOLAR or tile 6 in CRIMSON)
        const footRow = Math.floor((this.y + this.h + 2) / world.tileSize);
        const leftCol = Math.floor(this.x / world.tileSize);
        const rightCol = Math.floor((this.x + this.w - 0.01) / world.tileSize);
        let hitSpring = false;
        for (let c = leftCol; c <= rightCol; c++) {
          const t = world.getTile(c, footRow);
          if ((this.dimension === 'SOLAR' && t === 5) || (this.dimension === 'CRIMSON' && t === 6)) {
            hitSpring = true;
            break;
          }
        }

        if (hitSpring) {
          this.vy = -7.2; // Massive kinetic launch!
          this.grounded = false;
          this.jumpsLeft = 2;
          this.scaleX = 0.62;
          this.scaleY = 1.48;
          if (window.soundEngine) window.soundEngine.playSpring();
          const sColor = (this.dimension === 'SOLAR') ? '#ffb300' : '#ff1e42';
          if (window.particleSystem) {
            window.particleSystem.addShockwave(this.x + this.w / 2, this.y + this.h, sColor);
            window.particleSystem.emit(this.x + this.w / 2, this.y + this.h, sColor, 22, 4.0, 30);
          }
        } else if (!wasGrounded) {
          this.scaleX = 1.35;
          this.scaleY = 0.7;
          const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#ff1e42';
          if (window.particleSystem) {
            window.particleSystem.emitJumpDust(this.x + this.w / 2, this.y + this.h, color);
          }
        }
      }
    } else if (this.vy < 0) {
      if (this.checkSolidIntersection(this.x, this.y, world)) {
        this.y = Math.floor(this.y / world.tileSize) * world.tileSize + world.tileSize;
        this.vy = 0;
      }
    }

    // 10. Check Lantern interactions
    this.checkLanterns(world);

    // 11. Forgiving Hazard Check (Rule 3)
    // First contact: bounce + flashing warning for ~1.1s (Rule 3 telegraph).
    // When warning timer expires, the player dies.
    if (this.checkHazardIntersection(world) && this.invulnerableTimer <= 0) {
      this.triggerHazardWarning();
    }
    if (this.hazardWarningTimer === 1) {
      // Warning just expired — deal the kill
      this.kill();
      return false;
    }

    // 12. Squash & Stretch recovery (Ori springiness)
    this.scaleX += (1.0 - this.scaleX) * 0.15;
    this.scaleY += (1.0 - this.scaleY) * 0.15;

    // 13. Dynamic Particle Trail
    if (Math.abs(this.vx) > 1.6 || !this.grounded) {
      this.trail.push({
        x: this.x,
        y: this.y,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        alpha: 0.4,
        color: (this.dimension === 'SOLAR') ? '#ffb300' : '#ff1e42'
      });
      if (this.trail.length > 7) this.trail.shift();
    } else {
      if (this.trail.length > 0) this.trail.shift();
    }

    for (let t of this.trail) {
      t.alpha -= 0.05;
    }

    return false;
  }

  draw(ctx, renderOffset) {
    if (this.isDead) return;

    const screenX = Math.floor(this.x - renderOffset.x);
    const screenY = Math.floor(this.y - renderOffset.y);

    // Hazard warning flash (Rule 3 telegraphing)
    if (this.hazardWarningTimer > 0 && Math.floor(performance.now() * 0.015) % 2 === 0) {
      ctx.save();
      ctx.fillStyle = '#ff1744';
      ctx.globalAlpha = 0.7;
      ctx.fillRect(screenX - 2, screenY - 2, this.w + 4, this.h + 4);
      ctx.restore();
    }

    // 1. Draw Spirit Ghost Trail
    for (let t of this.trail) {
      if (t.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 8;
      const tx = Math.floor(t.x - renderOffset.x);
      const ty = Math.floor(t.y - renderOffset.y);
      ctx.translate(tx + this.w / 2, ty + this.h / 2);
      ctx.scale(t.scaleX, t.scaleY);
      ctx.beginPath();
      ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. High-contrast Player Sprite (Rule 4: large and readable from 2 meters)
    const isSolar = (this.dimension === 'SOLAR');
    const auraColor = isSolar ? '#ffb300' : '#ff1e42';
    const bodyColor = isSolar ? '#ffe082' : '#ff5252';
    const coreColor = '#ffffff';

    ctx.save();
    ctx.translate(screenX + this.w / 2, screenY + this.h / 2);
    ctx.scale(this.scaleX * this.facing, this.scaleY);

    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 18;

    // Outer Radiant Aura
    ctx.fillStyle = auraColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2 + 1, this.h / 2 + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body Gradient
    ctx.fillStyle = bodyColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2 - 1, this.h / 2 - 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // High-Contrast Core
    ctx.fillStyle = coreColor;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.ellipse(0, -1, this.w / 2 - 3, this.h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Expressive Eye
    ctx.fillStyle = isSolar ? '#2e1906' : '#140306';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(3, -2, 2.2, 3.2, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

window.Player = Player;
