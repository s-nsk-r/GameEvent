// Phase Courier - Ori-Inspired Fluid Physics Engine
// Features: Variable Jump, Double Jump, Feather Float, Biphase Air-Dash, Wall Latch & Leap, and Squash & Stretch.

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 14;
    this.h = 18;

    this.vx = 0;
    this.vy = 0;

    // Movement tuning
    this.runSpeed = 3.2;
    this.accel = 0.52;
    this.decel = 0.7;
    this.gravity = 0.28;
    this.maxFallSpeed = 6.0;
    this.floatFallSpeed = 1.15; // Feather float speed
    this.jumpForce = -5.8;
    this.doubleJumpForce = -5.4;

    // Air Dash (Ori-style Z Dash)
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 11; // frames
    this.dashSpeed = 7.8;
    this.canDash = true;
    this.dashCooldown = 0;

    // Jump tracking
    this.grounded = false;
    this.coyoteTime = 0;
    this.maxCoyote = 6;
    this.jumpBuffer = 0;
    this.maxJumpBuffer = 5;
    this.jumpsLeft = 2; // Allows double jump

    // Wall interaction
    this.onWall = 0; // -1: left, 1: right
    this.wallSlideSpeed = 1.2;
    this.wallJumpLockout = 0;

    this.facing = 1;
    this.dimension = 'SOLAR'; // 'SOLAR' or 'VOID'

    // Squash & Stretch
    this.scaleX = 1.0;
    this.scaleY = 1.0;

    // State & FX
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
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.trail = [];
  }

  phaseDash(input) {
    if (!this.canDash || this.isDead || this.dashCooldown > 0) return;

    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.canDash = false;
    this.dashCooldown = 18;

    // Determine dash direction
    let dirX = this.facing;
    let dirY = 0;
    if (input.up) dirY = -0.7;
    if (input.down && !this.grounded) dirY = 0.7;
    if (input.left) dirX = -1;
    if (input.right) dirX = 1;

    // Normalize
    const len = Math.hypot(dirX, dirY) || 1;
    this.vx = (dirX / len) * this.dashSpeed;
    this.vy = (dirY / len) * this.dashSpeed * 0.8;

    // Dimension swap on dash!
    this.dimension = (this.dimension === 'SOLAR') ? 'VOID' : 'SOLAR';
    window.soundEngine.setDimension(this.dimension);
    window.soundEngine.playPhase(this.dimension);

    // Squash & stretch on dash
    this.scaleX = 1.6;
    this.scaleY = 0.55;

    // Audio & particles
    const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
    window.particleSystem.addShockwave(this.x + this.w / 2, this.y + this.h / 2, color);
    window.particleSystem.emit(this.x + this.w / 2, this.y + this.h / 2, color, 20, 4, 25);
  }

  isTileSolid(tile) {
    if (tile === 1) return true; // Organic terrain
    if (this.dimension === 'SOLAR' && tile === 2) return true; // Gold solid in Solar
    if (this.dimension === 'VOID' && tile === 3) return true;   // Cyan solid in Void
    return false;
  }

  isTileHazard(tile) {
    if (tile === 4) return true; // Thorns
    if (this.dimension === 'SOLAR' && tile === 3) return true; // Cyan crystals kill in Solar
    if (this.dimension === 'VOID' && tile === 2) return true;  // Gold crystals kill in Void
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
    // Forgiving hitbox for hazards
    const hx = this.x + 3;
    const hy = this.y + 3;
    const hw = this.w - 6;
    const hh = this.h - 6;

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

  checkSprings(world) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h;
    const col = Math.floor(cx / world.tileSize);
    const row = Math.floor(cy / world.tileSize);
    const tile = world.getTile(col, row);

    if ((tile === 5 && this.dimension === 'SOLAR') || (tile === 6 && this.dimension === 'VOID')) {
      this.vy = -8.6;
      this.grounded = false;
      this.canDash = true;
      this.jumpsLeft = 2;
      this.scaleX = 0.6;
      this.scaleY = 1.5;
      window.soundEngine.playSpring();
      const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
      window.particleSystem.emit(cx, cy, color, 18, 5, 25, 3, -0.08);
    }
  }

  checkLanterns(world) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    for (let lantern of world.lanterns) {
      const dist = Math.hypot(cx - lantern.x, cy - lantern.y);
      if (dist < lantern.radius + 12 && lantern.timer <= 0) {
        // Reset abilities & propel player
        this.canDash = true;
        this.jumpsLeft = 2;
        lantern.timer = 60; // cooldown
        window.soundEngine.playSpring();
        const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
        window.particleSystem.addShockwave(lantern.x, lantern.y, color);
        window.particleSystem.emit(lantern.x, lantern.y, color, 15, 3.5, 20);
      }
      if (lantern.timer > 0) lantern.timer--;
    }
  }

  kill() {
    if (this.isDead) return;
    this.isDead = true;
    this.deathTimer = 28;
    window.soundEngine.playDeath();
    const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
    window.particleSystem.emitDeathExplosion(this.x + this.w / 2, this.y + this.h / 2, color);
  }

  update(input, world) {
    if (this.isDead) {
      this.deathTimer--;
      return this.deathTimer <= 0; // returns true when ready to respawn
    }

    if (this.dashCooldown > 0) this.dashCooldown--;

    // 1. Dash State Handling
    if (this.isDashing) {
      this.dashTimer--;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.vx *= 0.5;
        this.vy *= 0.5;
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

      if (input.jumpPressed) {
        this.jumpBuffer = this.maxJumpBuffer;
      } else if (this.jumpBuffer > 0) {
        this.jumpBuffer--;
      }

      if (this.wallJumpLockout > 0) this.wallJumpLockout--;

      // 3. Horizontal Movement
      let moveDir = 0;
      if (input.left) moveDir -= 1;
      if (input.right) moveDir += 1;

      if (moveDir !== 0) {
        this.facing = moveDir;
        if (this.wallJumpLockout === 0) {
          this.vx += moveDir * this.accel;
          if (Math.abs(this.vx) > this.runSpeed) {
            this.vx = moveDir * this.runSpeed;
          }
        }
      } else {
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
        if (touchingLeft) this.onWall = -1;
        if (touchingRight) this.onWall = 1;

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
      // If holding space while falling, activate Feather Glide!
      if (!this.grounded && input.jumpHold && this.vy > 0) {
        if (this.vy > this.floatFallSpeed) {
          this.vy = this.floatFallSpeed;
        }
        currentGravity = 0.05;

        // Emit gentle feather drift motes
        if (Math.random() > 0.4) {
          const color = (this.dimension === 'SOLAR') ? '#ffe082' : '#80d8ff';
          window.particleSystem.emit(this.x + this.w / 2, this.y + this.h - 2, color, 1, 0.8, 20, 2, 0.02);
        }
      }

      this.vy += currentGravity;
      if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;

      // 6. Jumping (Variable + Double Jump + Wall Jump)
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
          this.vx = -this.onWall * (this.runSpeed * 1.3);
          this.wallJumpLockout = 8;
          this.jumpBuffer = 0;
          this.jumpsLeft = 1;
          this.scaleX = 0.75;
          this.scaleY = 1.3;
          window.soundEngine.playWallJump();
          const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
          window.particleSystem.emit(this.x + this.w / 2, this.y + this.h / 2, color, 8, 3, 15);
        } else if (this.jumpsLeft > 0) {
          // Double Jump (Ori flip)
          this.vy = this.doubleJumpForce;
          this.jumpBuffer = 0;
          this.jumpsLeft = 0;
          this.scaleX = 1.25;
          this.scaleY = 0.8;
          window.soundEngine.playWallJump();
          const color = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
          window.particleSystem.addShockwave(this.x + this.w / 2, this.y + this.h / 2, color);
          window.particleSystem.emit(this.x + this.w / 2, this.y + this.h / 2, color, 12, 3, 20);
        }
      }

      // Variable Jump Cut
      if (!input.jumpHold && this.vy < -1.5) {
        this.vy *= 0.52;
      }
    }

    // 7. Resolve Horizontal Collisions
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

    // 8. Resolve Vertical Collisions
    this.y += this.vy;
    const wasGrounded = this.grounded;
    this.grounded = false;

    if (this.vy > 0) {
      if (this.checkSolidIntersection(this.x, this.y, world)) {
        this.y = Math.floor((this.y + this.h) / world.tileSize) * world.tileSize - this.h;
        this.vy = 0;
        this.grounded = true;

        // Landing squash
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

    // 9. Springs and Lanterns
    this.checkSprings(world);
    this.checkLanterns(world);

    // 10. Check Hazards (Only if not dashing or if hitting universal spikes)
    if (this.checkHazardIntersection(world)) {
      this.kill();
      return false;
    }

    // 11. Squash & Stretch recovery lerp
    this.scaleX += (1.0 - this.scaleX) * 0.14;
    this.scaleY += (1.0 - this.scaleY) * 0.14;

    // 12. Spirit Trail
    if (this.isDashing || Math.abs(this.vx) > 2.0 || !this.grounded) {
      this.trail.push({
        x: this.x,
        y: this.y,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        alpha: this.isDashing ? 0.7 : 0.35,
        color: (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff'
      });
      if (this.trail.length > (this.isDashing ? 10 : 5)) this.trail.shift();
    } else {
      if (this.trail.length > 0) this.trail.shift();
    }

    for (let t of this.trail) {
      t.alpha -= 0.06;
    }

    return false;
  }

  draw(ctx, renderOffset) {
    if (this.isDead) return;

    const screenX = Math.floor(this.x - renderOffset.x);
    const screenY = Math.floor(this.y - renderOffset.y);

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

    // 2. Draw Ori-Style Spirit Courier
    const mainColor = (this.dimension === 'SOLAR') ? '#ffb300' : '#00e5ff';
    const coreColor = '#ffffff';

    ctx.save();
    ctx.translate(screenX + this.w / 2, screenY + this.h / 2);
    ctx.scale(this.scaleX * this.facing, this.scaleY);

    // Dynamic Spirit Aura
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 16;

    // Glowing Ethereal Body (Soft Spirit droplet)
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2 + 1, this.h / 2 + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pure White Inner Spirit Light
    ctx.fillStyle = coreColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(0, -1, this.w / 2 - 2, this.h / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Expressive Spirit Eyes
    ctx.fillStyle = '#060d17';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(3, -2, 2, 3, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Floating Ribbon Tail (ripples behind)
    const now = performance.now() * 0.01;
    const ripple = Math.sin(now) * 2;
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-this.w / 2, 2);
    ctx.quadraticCurveTo(-this.w / 2 - 8, ripple, -this.w / 2 - 14, ripple * 1.5);
    ctx.stroke();

    ctx.restore();
  }
}

window.Player = Player;
