// Phase Courier - Centralized Input Controller (Strictly AGENTS.md Compliant)
// ONLY 6 Allowed Keys: Up, Down, Left, Right, Z, Space
// Centralized in ONE place. No other files read raw keyboard events.

class InputController {
  constructor() {
    // Continuous held state (read every frame)
    this.held = {
      up: false,
      down: false,
      left: false,
      right: false,
      z: false,
      space: false
    };

    // Fresh press state (single-fire per physical press)
    this.justPressed = {
      up: false,
      down: false,
      left: false,
      right: false,
      z: false,
      space: false
    };

    // Internal tracker for previous frame's held state to guarantee fresh press detection
    this._prevHeld = {
      up: false,
      down: false,
      left: false,
      right: false,
      z: false,
      space: false
    };

    this._setupListeners();
  }

  _setupListeners() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser scrolling for Space and Arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      // Map ONLY the 6 allowed keys
      if (e.code === 'ArrowUp') this.held.up = true;
      else if (e.code === 'ArrowDown') this.held.down = true;
      else if (e.code === 'ArrowLeft') this.held.left = true;
      else if (e.code === 'ArrowRight') this.held.right = true;
      else if (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ') this.held.z = true;
      else if (e.code === 'Space' || e.key === ' ') this.held.space = true;
      // All other keys are ignored per Rule 1
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowUp') this.held.up = false;
      else if (e.code === 'ArrowDown') this.held.down = false;
      else if (e.code === 'ArrowLeft') this.held.left = false;
      else if (e.code === 'ArrowRight') this.held.right = false;
      else if (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ') this.held.z = false;
      else if (e.code === 'Space' || e.key === ' ') this.held.space = false;
    });

    // Rule 2: Clear all held keys on window blur event
    window.addEventListener('blur', () => {
      this.clearAll();
    });
  }

  // Called at the start of each frame in the game loop
  update() {
    for (let key in this.held) {
      // Just pressed = held this frame AND NOT held last frame
      this.justPressed[key] = this.held[key] && !this._prevHeld[key];
      this._prevHeld[key] = this.held[key];
    }
  }

  // Check if Z was freshly pressed (required for screen changes per Rule 2)
  isZJustPressed() {
    return this.justPressed.z;
  }

  // Consume fresh press so a held Z cannot trigger multiple transitions
  consumeZ() {
    this.justPressed.z = false;
    this._prevHeld.z = true; // Mark as already handled until released
  }

  clearAll() {
    for (let key in this.held) {
      this.held[key] = false;
      this.justPressed[key] = false;
      this._prevHeld[key] = false;
    }
  }
}

window.inputController = new InputController();
