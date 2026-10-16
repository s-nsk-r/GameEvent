// Phase Courier - Procedural Web Audio Engine
// Generates real-time sound effects and dynamic dual-stem music with zero external audio assets.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicGain = null;
    this.sfxGain = null;
    this.filterNode = null;
    this.isInitialized = false;

    // Music State
    this.tempo = 128; // BPM
    this.step = 0;
    this.currentDimension = 'SOLAR'; // SOLAR or VOID
    this.musicTimer = null;

    // Chord progressions in A minor / C major:
    // Chords: Am, F, C, G
    this.bassNotesSolar = [110, 87.31, 130.81, 98.00]; // A2, F2, C3, G2
    this.leadNotesSolar = [440, 523.25, 659.25, 587.33, 523.25, 440, 659.25, 783.99]; // Melody scale
    this.bassNotesVoid = [55, 43.65, 65.41, 49.00]; // A1, F1, C2, G1 (deep sub-bass)
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Gains
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Filter Node for Dimension Swapping
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(2200, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(3.5, this.ctx.currentTime);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      this.musicGain.connect(this.filterNode);
      this.filterNode.connect(this.masterGain);

      this.isInitialized = true;
      this.startMusicLoop();
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setDimension(dim) {
    this.currentDimension = dim;
    if (!this.filterNode || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (dim === 'SOLAR') {
      // Warm, open, bright synth harmonics
      this.filterNode.frequency.cancelScheduledValues(now);
      this.filterNode.frequency.setTargetAtTime(2400, now, 0.08);
      this.filterNode.Q.setTargetAtTime(2.0, now, 0.08);
    } else {
      // Submerged, reverberant, deep atmospheric bass
      this.filterNode.frequency.cancelScheduledValues(now);
      this.filterNode.frequency.setTargetAtTime(650, now, 0.08);
      this.filterNode.Q.setTargetAtTime(5.0, now, 0.08);
    }
  }

  startMusicLoop() {
    if (!this.ctx) return;
    const stepDuration = (60 / this.tempo) / 4; // 16th notes
    
    const playTick = () => {
      if (this.isMuted || !this.isInitialized) {
        this.musicTimer = setTimeout(playTick, stepDuration * 1000);
        return;
      }

      const bar = Math.floor(this.step / 16) % 4;
      const beat = this.step % 16;
      const now = this.ctx.currentTime;

      // Bassline on 1st, 5th, 9th, 13th 16th notes
      if (beat % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassEnv = this.ctx.createGain();
        bassOsc.type = (this.currentDimension === 'SOLAR') ? 'sawtooth' : 'triangle';
        const rootFreq = (this.currentDimension === 'SOLAR') ? this.bassNotesSolar[bar] : this.bassNotesVoid[bar];
        bassOsc.frequency.setValueAtTime(rootFreq, now);

        bassEnv.gain.setValueAtTime(0.5, now);
        bassEnv.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 3.5);

        bassOsc.connect(bassEnv);
        bassEnv.connect(this.musicGain);

        bassOsc.start(now);
        bassOsc.stop(now + stepDuration * 3.5);
      }

      // Arpeggiated Melody Motes
      if (beat % 2 === 0 && Math.random() > 0.25) {
        const leadOsc = this.ctx.createOscillator();
        const leadEnv = this.ctx.createGain();
        leadOsc.type = (this.currentDimension === 'SOLAR') ? 'square' : 'sine';
        
        const noteIndex = (beat / 2 + bar * 2) % this.leadNotesSolar.length;
        let noteFreq = this.leadNotesSolar[noteIndex];
        if (this.currentDimension === 'VOID') noteFreq *= 0.5; // Octave lower in dark world

        leadOsc.frequency.setValueAtTime(noteFreq, now);
        leadEnv.gain.setValueAtTime(0.18, now);
        leadEnv.gain.exponentialRampToValueAtTime(0.0001, now + stepDuration * 1.8);

        leadOsc.connect(leadEnv);
        leadEnv.connect(this.musicGain);

        leadOsc.start(now);
        leadOsc.stop(now + stepDuration * 1.8);
      }

      this.step++;
      this.musicTimer = setTimeout(playTick, stepDuration * 1000);
    };

    playTick();
  }

  // SOUND EFFECTS
  playJump() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  playWallJump() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  playPhase(toDimension) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Resonant FM/Chirp pulse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = (toDimension === 'SOLAR') ? 'sawtooth' : 'sine';

    if (toDimension === 'SOLAR') {
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
    } else {
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.16);
    }

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.19);
  }

  playDeath() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Glitch crunch noise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  playSpring() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(850, now + 0.22);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  playTerminalBlip() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700 + Math.random() * 200, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playLevelComplete() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A, C#, E, A

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.3, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.26);
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

window.soundEngine = new SoundEngine();
