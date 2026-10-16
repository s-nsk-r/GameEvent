// Phase Courier - Physics & Player Engine (AGENTS.md Compliant)
// Forgiving, readable mechanics: generous hitboxes, 1+ second reaction windows, and non-punishing controls.

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 18; // Generous player size (easily visible from 2 meters)
    this.h = 24;

    this.vx = 0;
    this.vy = 0;

    // Moderate, forgiving movement tuning (Rule 3)
    this.runSpeed = 2.8;
    this.accel = 0.45;
    this.decel = 0.55;
    this.gravity = 0.24;
    this.maxFallSpeed = 4.8;
    this.floatFallSpeed = 1.2;
    this.jumpForce = -5.5;
    this.doubleJumpForce = -5.0;

    // Dimension Phase (Space - Secondary Action)
    // Rule 1: "Space must never be needed more than about once every 2 seconds, and never needs to be held for long"
    this.dimension = 'SOLAR'; // 'SOLAR' or 'VOID'
    this.phaseCooldown = 0;
    this.maxPhaseCooldown = 120; // 2.0 seconds at 60fps

    // Air-Dash (Z - Primary Action)
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 10;
    this.dashSpeed = 6.2;
    this.canDash = true;

    // Jump tracking (via Up Arrow)
    this.grounded = false;
    this.coyoteTime = 0;
    this.maxCoyote = 8; // Generous coyote grace (Rule 3)
    this.jumpBuffer = 0;
    this.maxJumpBuffer = 7;
    this.jumpsLeft = 2;

    // Wall interaction
    this.onWall = 0;
    this.wallSlideSpeed = 1.1;
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
      this.x = this.respawnBeacon.x;
      this.y = this.respawnBeacon.y;
    } else {
      this.x = 240;
      this.y = 420;
    }
    this.vx = 0;
    this.vy = 0;
    this.isDead = false;
    this.deathTimer = 0;
    this.isDashing = false;
    this.canDash = true;
    this.jumpsLeft = 2;
    this.hazardWarningTimer = 0;
    this.invulnerableTimer = 60; // 1s grace on respawn
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.trail = [];
  }

  triggerDimensionPhase() {
    if (this.phaseCooldown > 0 || this.isDead) return;

    this.dimension = (this.dimension === 'SOLAR') ? 'VOID' : 'SOLAR';
    this.phaseCooldown = this.maxPhaseCooldown;

    window.soundEngine.setDimension(this.dimension);
    window.soundEngine.playPhase(this.dimension);

    const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
    window.particleSystem.addShockwave(this.x + this.w / 2, this.y + this.h / 2, color);
    window.particleSystem.emit(this.x + this.w / 2, this.y + this.h / 2, color, 20, 3.5, 25);
  }

  triggerAirDash(input) {
    if (!this.canDash || this.isDead || this.isDashing) return;

    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.canDash = false;

    let dirX = this.facing;
    let dirY = 0;
    if (input.held.up) dirY = -0.6;
    if (input.held.down && !this.grounded) dirY = 0.6;
    if (input.held.left) dirX = -1;
    if (input.held.right) dirX = 1;

    const len = Math.hypot(dirX, dirY) || 1;
    this.vx = (dirX / len) * this.dashSpeed;
    this.vy = (dirY / len) * this.dashSpeed * 0.75;

    this.scaleX = 1.5;
    this.scaleY = 0.6;

    const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
    window.soundEngine.playJump();
    window.particleSystem.emit(this.x + this.w / 2, this.y + this.h / 2, color, 14, 3, 20);
  }

  isTileSolid(tile) {
    if (tile === 1) return true; // Universal stone/wood
    if (this.dimension === 'SOLAR' && tile === 2) return true; // Gold solid in Solar
    if (this.dimension === 'VOID' && tile === 3) return true;   // Cyan solid in Void
    return false;
  }

  isTileHazard(tile) {
    if (tile === 4) return true; // Thorns
    if (this.dimension === 'SOLAR' && tile === 3) return true; // Cyan crystals dangerous in Solar
    if (this.dimension === 'VOID' && tile === 2) return true;  // Gold crystals dangerous in Void
    return false;
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
        this.canDash = true;
        this.jumpsLeft = 2;
        lantern.timer = 50;
        window.soundEngine.playSpring();
        const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
        window.particleSystem.addShockwave(lantern.x, lantern.y, color);
      }
      if (lantern.timer > 0) lantern.timer--;
    }
  }

  triggerHazardWarning() {
    if (this.invulnerableTimer > 0) return;

    // Rule 3: Forgiving reaction window. Bounce player upward and warn for 1 second
    this.hazardWarningTimer = 65; // ~1.1 seconds warning
    this.invulnerableTimer = 90;
    this.vy = -4.0; // gentle bounce back to safety
    this.vx = -this.facing * 2.0;

    window.soundEngine.playDeath();
    window.particleSystem.emit(this.x + this.w / 2, this.y + this.h / 2, '#ff1744', 16, 2.5, 30);
  }

  kill() {
    if (this.isDead) return;
    this.isDead = true;
    this.deathTimer = 25;
    window.soundEngine.playDeath();
    const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
    window.particleSystem.emitDeathExplosion(this.x + this.w / 2, this.y + this.h / 2, color);
  }

  update(input, world) {
    if (this.isDead) {
      this.deathTimer--;
      return this.deathTimer <= 0;
    }

    // Cooldown timers
    if (this.phaseCooldown > 0) this.phaseCooldown--;
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    if (this.hazardWarningTimer > 0) this.hazardWarningTimer--;

    // Secondary Action: Dimension Phase on Space (Fresh press, rate-limited)
    if (input.justPressed.space) {
      this.triggerDimensionPhase();
    }

    // Primary Action: Air-Dash on Z (Fresh press)
    if (input.justPressed.z) {
      this.triggerAirDash(input);
    }

    // 1. Dash Execution
    if (this.isDashing) {
      this.dashTimer--;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.vx *= 0.4;
        this.vy *= 0.4;
      }
    } else {
      // 2. Timers & Buffers
      if (this.grounded) {
        this.coyoteTime = this.maxCoyote;
        this.jumpsLeft = 2;
        this.canDash = true;
      } else if (this.coyoteTime > 0) {
        this.coyoteTime--;
      }

      // Jump input via Up Arrow
      if (input.justPressed.up) {
        this.jumpBuffer = this.maxJumpBuffer;
      } else if (this.jumpBuffer > 0) {
        this.jumpBuffer--;
      }

      if (this.wallJumpLockout > 0) this.wallJumpLockout--;

      // 3. Continuous Horizontal Movement on Held Arrow Keys (Rule 2)
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
        // Releasing keys stops smoothly (Rule 2: never causes instant loss)
        if (this.wallJumpLockout === 0) {
          if (Math.abs(this.vx) > this.decel) {
            this.vx -= Math.sign(this.vx) * this.decel;
          } else {
            this.vx = 0;
          }
        }
      }

      // 4. Wall Latch & Slide
      this.onWall = 0;
      const touchingLeft = this.checkSolidIntersection(this.x - 1, this.y, world);
      const touchingRight = this.checkSolidIntersection(this.x + 1, this.y, world);

      if (!this.grounded && (touchingLeft || touchingRight)) {
        this.onWall = touchingLeft ? -1 : 1;
        this.canDash = true;
        this.jumpsLeft = 2;

        if (this.vy > this.wallSlideSpeed) {
          this.vy = this.wallSlideSpeed;
        }

        const sparkX = (this.onWall === -1) ? this.x : this.x + this.w;
        const sparkColor = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
        window.particleSystem.emitWallSlideSparks(sparkX, this.y + this.h / 2, this.onWall, sparkColor);
      }

      // 5. Gravity & Feather Float
      let currentGravity = this.gravity;
      if (!this.grounded && input.held.up && this.vy > 0) {
        if (this.vy > this.floatFallSpeed) {
          this.vy = this.floatFallSpeed;
        }
        currentGravity = 0.06;
      }

      this.vy += currentGravity;
      if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;

      // 6. Jumping with Up Arrow
      if (this.jumpBuffer > 0) {
        if (this.coyoteTime > 0) {
          // Ground Jump
          this.vy = this.jumpForce;
          this.grounded = false;
          this.coyoteTime = 0;
          this.jumpBuffer = 0;
          this.jumpsLeft = 1;
          this.scaleX = 0.75;
          this.scaleY = 1.35;
          window.soundEngine.playJump();
          const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
          window.particleSystem.emitJumpDust(this.x + this.w / 2, this.y + this.h, color);
        } else if (this.onWall !== 0) {
          // Wall Leap
          this.vy = this.jumpForce * 0.95;
          this.vx = -this.onWall * (this.runSpeed * 1.25);
          this.wallJumpLockout = 9;
          this.jumpBuffer = 0;
          this.jumpsLeft = 1;
          this.scaleX = 0.75;
          this.scaleY = 1.3;
          window.soundEngine.playWallJump();
        } else if (this.jumpsLeft > 0) {
          // Double Jump
          this.vy = this.doubleJumpForce;
          this.jumpBuffer = 0;
          this.jumpsLeft = 0;
          this.scaleX = 1.25;
          this.scaleY = 0.8;
          window.soundEngine.playWallJump();
          const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
          window.particleSystem.addShockwave(this.x + this.w / 2, this.y + this.h / 2, color);
        }
      }

      // Variable jump height: releasing Up early dampens ascent
      if (!input.held.up && this.vy < -1.5) {
        this.vy *= 0.52;
      }
    }

    // 7. Apply Horizontal Velocity
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

    // 8. Apply Vertical Velocity
    this.y += this.vy;
    const wasGrounded = this.grounded;
    this.grounded = false;

    if (this.vy > 0) {
      if (this.checkSolidIntersection(this.x, this.y, world)) {
        this.y = Math.floor((this.y + this.h) / world.tileSize) * world.tileSize - this.h;
        this.vy = 0;
        this.grounded = true;

        if (!wasGrounded) {
          this.scaleX = 1.35;
          this.scaleY = 0.7;
          const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
          window.particleSystem.emitJumpDust(this.x + this.w / 2, this.y + this.h, color);
        }
      }
    } else if (this.vy < 0) {
      if (this.checkSolidIntersection(this.x, this.y, world)) {
        this.y = Math.floor(this.y / world.tileSize) * world.tileSize + world.tileSize;
        this.vy = 0;
      }
    }

    // 9. Lanterns check
    this.checkLanterns(world);

    // 10. Forgiving Hazard Check (Rule 3)
    if (this.checkHazardIntersection(world)) {
      if (this.hazardWarningTimer <= 0 && this.invulnerableTimer <= 0) {
        this.triggerHazardWarning();
      } else if (this.hazardWarningTimer > 0 && this.invulnerableTimer <= 0) {
        this.kill();
        return false;
      }
    }

    // 11. Squash & Stretch recovery
    this.scaleX += (1.0 - this.scaleX) * 0.14;
    this.scaleY += (1.0 - this.scaleY) * 0.14;

    // 12. Trail
    if (this.isDashing || Math.abs(this.vx) > 1.8 || !this.grounded) {
      this.trail.push({
        x: this.x,
        y: this.y,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        alpha: this.isDashing ? 0.75 : 0.35,
        color: (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff'
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

    // 2. High-contrast Player (Rule 4: large and readable from 2 meters)
    const mainColor = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
    const coreColor = '#ffffff';

    ctx.save();
    ctx.translate(screenX + this.w / 2, screenY + this.h / 2);
    ctx.scale(this.scaleX * this.facing, this.scaleY);

    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 18;

    // Glowing Ethereal Body
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2 + 1, this.h / 2 + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // High-Contrast White Core
    ctx.fillStyle = coreColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(0, -1, this.w / 2 - 2, this.h / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Expressive Eye
    ctx.fillStyle = '#060d17';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(3, -2, 2.5, 3.5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

window.Player = Player;
