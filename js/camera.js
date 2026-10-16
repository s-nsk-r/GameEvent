// Phase Courier - Cinematic Kinematic Camera (Ori-Style Smooth Tracking)

class Camera {
  constructor(viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;

    // Smoothness damping (lower = silkier, higher = snappier)
    this.lerpSpeed = 0.085;

    // Lookahead (leads the camera in the direction the player is moving)
    this.lookAheadX = 0;
    this.lookAheadY = 0;
    this.maxLookAheadX = 75;
    this.maxLookAheadY = 40;

    // Bounds of the world (in pixels)
    this.worldWidth = 3600;
    this.worldHeight = 1600;

    // Screen Shake
    this.shakeIntensity = 0;
  }

  setWorldBounds(width, height) {
    this.worldWidth = width;
    this.worldHeight = height;
  }

  snapTo(x, y) {
    this.targetX = x - this.viewWidth / 2;
    this.targetY = y - this.viewHeight / 2;
    this.clampTarget();
    this.x = this.targetX;
    this.y = this.targetY;
  }

  shake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  update(player) {
    // Dynamic lookahead based on player velocity and facing
    const desiredLookX = player.vx * 18 + player.facing * 20;
    const desiredLookY = (player.vy > 1) ? 35 : (player.vy < -1 ? -25 : 0);

    this.lookAheadX += (desiredLookX - this.lookAheadX) * 0.05;
    this.lookAheadY += (desiredLookY - this.lookAheadY) * 0.05;

    // Clamp lookahead
    this.lookAheadX = Math.max(-this.maxLookAheadX, Math.min(this.maxLookAheadX, this.lookAheadX));
    this.lookAheadY = Math.max(-this.maxLookAheadY, Math.min(this.maxLookAheadY, this.lookAheadY));

    // Target is centered on player + lookahead
    this.targetX = (player.x + player.w / 2) - this.viewWidth / 2 + this.lookAheadX;
    this.targetY = (player.y + player.h / 2) - this.viewHeight / 2 + this.lookAheadY;

    this.clampTarget();

    // Smooth interpolation (lerp)
    this.x += (this.targetX - this.x) * this.lerpSpeed;
    this.y += (this.targetY - this.y) * this.lerpSpeed;

    // Screen shake decay
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.88;
      if (this.shakeIntensity < 0.1) this.shakeIntensity = 0;
    }
  }

  clampTarget() {
    this.targetX = Math.max(0, Math.min(this.worldWidth - this.viewWidth, this.targetX));
    this.targetY = Math.max(0, Math.min(this.worldHeight - this.viewHeight, this.targetY));
  }

  getRenderOffsets() {
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
    }
    return {
      x: Math.floor(this.x + shakeX),
      y: Math.floor(this.y + shakeY)
    };
  }
}

window.Camera = Camera;
