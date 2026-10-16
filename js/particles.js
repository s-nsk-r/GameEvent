// Phase Courier - Bioluminescent Particle & Lighting Engine (Ori Atmosphere)

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
    this.ambientMotes = [];
    this.maxParticles = 350;
    this.initAmbientMotes(60);
  }

  initAmbientMotes(count) {
    for (let i = 0; i < count; i++) {
      this.ambientMotes.push({
        screenX: Math.random() * 640,
        screenY: Math.random() * 360,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 2.5 + 1,
        alpha: Math.random() * 0.6 + 0.15,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  emit(x, y, color, count = 10, speed = 2.5, life = 25, size = 3, gravity = 0.08) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.8 + 0.2) * speed;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: color,
        maxLife: life,
        life: life,
        size: Math.random() * size + 1.5,
        gravity: gravity
      });
    }
  }

  emitJumpDust(x, y, color) {
    for (let i = 0; i < 9; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -Math.random() * 1.5,
        color: color,
        maxLife: 20,
        life: 20,
        size: Math.random() * 2.5 + 1.2,
        gravity: 0.05
      });
    }
  }

  emitWallSlideSparks(x, y, dir, color) {
    if (Math.random() > 0.4) return;
    this.particles.push({
      x: x,
      y: y + (Math.random() - 0.5) * 10,
      vx: -dir * (Math.random() * 2 + 0.5),
      vy: (Math.random() - 0.5) * 2,
      color: color,
      maxLife: 16,
      life: 16,
      size: Math.random() * 2 + 1,
      gravity: 0.12
    });
  }

  emitDeathExplosion(x, y, color) {
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 5 + 1.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: color,
        maxLife: 45,
        life: 45,
        size: Math.random() * 4.5 + 2,
        gravity: 0.1
      });
    }
  }

  addShockwave(x, y, color) {
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 4,
      maxRadius: 160,
      color: color,
      alpha: 0.95,
      speed: 10
    });
  }

  update(dimension) {
    // Ambient floating forest motes (screen space)
    const driftY = (dimension === 'SOLAR') ? -0.2 : 0.2;
    for (let mote of this.ambientMotes) {
      mote.screenY += mote.vy + driftY;
      mote.screenX += mote.vx;
      mote.phase += 0.03;
      if (mote.screenY < 0) mote.screenY = 360;
      if (mote.screenY > 360) mote.screenY = 0;
      if (mote.screenX < 0) mote.screenX = 640;
      if (mote.screenX > 640) mote.screenX = 0;
    }

    // World space particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // World space shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += s.speed;
      s.alpha = 1 - (s.radius / s.maxRadius);
      if (s.radius >= s.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  draw(ctx, dimension, renderOffset) {
    const moteColor = (dimension === 'SOLAR') ? 'rgba(255, 179, 0, ' : 'rgba(0, 229, 255, ';

    // 1. Draw ambient floating forest spores
    for (let mote of this.ambientMotes) {
      const alpha = (Math.sin(mote.phase) * 0.3 + 0.7) * mote.alpha;
      ctx.fillStyle = `${moteColor}${alpha})`;
      ctx.fillRect(Math.floor(mote.screenX), Math.floor(mote.screenY), mote.size, mote.size);
    }

    // 2. Draw world particles
    for (let p of this.particles) {
      const sx = Math.floor(p.x - renderOffset.x);
      const sy = Math.floor(p.y - renderOffset.y);

      // Viewport culling
      if (sx < -20 || sx > 660 || sy < -20 || sy > 380) continue;

      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
      ctx.restore();
    }

    // 3. Draw shockwaves
    for (let s of this.shockwaves) {
      const sx = Math.floor(s.x - renderOffset.x);
      const sy = Math.floor(s.y - renderOffset.y);

      ctx.save();
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.strokeStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
    this.shockwaves = [];
  }
}

window.particleSystem = new ParticleSystem();
