/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Procedural Web Audio API sound generator for Bangladeshi Highway Bus Simulator.
 * Features:
 * - Diesel engine synthesized RPM oscillator with harmonic distortion & low-pass filtering.
 * - Pneumatic air brake release hiss (pfffftt!).
 * - Dual-tone melodic hydraulic Bangladeshi bus air horn ("pee-poo-peep-pee-poo").
 * - Turn indicator relay clicks.
 * - Near-miss whoosh and crash impact.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine synth nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;

  private isEngineRunning: boolean = false;
  private lastIndicatorTickTime: number = 0;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.8;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Start the continuous diesel engine sound
   */
  public startEngine() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isEngineRunning) return;

    try {
      const now = this.ctx.currentTime;

      // Primary engine rumble (sawtooth for diesel rasp)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(38, now); // idle ~38Hz

      // Secondary engine harmonic (triangle for deep displacement)
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(76, now);

      // Low pass filter to simulate thick bus chassis enclosure
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(260, now);
      this.engineFilter.Q.setValueAtTime(2.5, now);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.25, now);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start(now);
      this.engineOsc2.start(now);

      // Generate road vibration / exhaust rumble noise
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(140, now);
      noiseFilter.Q.setValueAtTime(3, now);

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.08, now);

      this.noiseNode.connect(noiseFilter);
      noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain);
      this.noiseNode.start(now);

      this.isEngineRunning = true;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Update engine sound based on vehicle speed (0 to 140 km/h) and throttle (0 to 1)
   */
  public updateEngine(speedKmh: number, throttle: number) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    const now = this.ctx.currentTime;
    // Map speed to RPM pitch: idle ~38Hz to max speed ~140Hz
    const normalizedSpeed = Math.min(speedKmh / 140, 1.2);
    const targetFreq = 38 + normalizedSpeed * 75 + throttle * 25;
    const targetFilterFreq = 240 + normalizedSpeed * 400 + throttle * 220;

    this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 2, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetFilterFreq, now, 0.08);

    if (this.engineGain) {
      const volume = 0.22 + normalizedSpeed * 0.15 + throttle * 0.12;
      this.engineGain.gain.setTargetAtTime(volume, now, 0.08);
    }
  }

  /**
   * Pneumatic Air Brake Release Hiss ("psssssht!")
   */
  public playAirBrakeHiss() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 0.45;

    // Create burst of high-pressure air hiss
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.18));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  /**
   * Iconic Bangladeshi Musical Dual-Tone Air Horn ("pee-poo-peep-pee-poo")
   */
  public playBanglaAirHorn() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Rhythmic musical horn notes sequence (Bengali highway bus style: Hanif/Shohagh air horn)
    const notes = [
      { f1: 440, f2: 554, duration: 0.12, time: 0 },
      { f1: 370, f2: 494, duration: 0.12, time: 0.13 },
      { f1: 440, f2: 554, duration: 0.18, time: 0.26 },
      { f1: 494, f2: 659, duration: 0.28, time: 0.46 },
    ];

    notes.forEach((note) => {
      if (!this.ctx || !this.masterGain) return;
      const noteTime = now + note.time;

      const oscA = this.ctx.createOscillator();
      const oscB = this.ctx.createOscillator();
      oscA.type = 'sawtooth';
      oscB.type = 'sawtooth';
      oscA.frequency.setValueAtTime(note.f1, noteTime);
      oscB.frequency.setValueAtTime(note.f2, noteTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime((note.f1 + note.f2) / 2, noteTime);
      filter.Q.setValueAtTime(4.0, noteTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.4, noteTime + 0.02);
      gain.gain.setValueAtTime(0.38, noteTime + note.duration - 0.03);
      gain.gain.linearRampToValueAtTime(0.001, noteTime + note.duration);

      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      oscA.start(noteTime);
      oscB.start(noteTime);
      oscA.stop(noteTime + note.duration);
      oscB.stop(noteTime + note.duration);
    });
  }

  /**
   * Turn signal indicator relay click (tick... tock...)
   */
  public playIndicatorTick(isTock: boolean) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (now - this.lastIndicatorTickTime < 0.25) return;
    this.lastIndicatorTickTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isTock ? 780 : 920, now);
    osc.frequency.exponentialRampToValueAtTime(isTock ? 350 : 420, now + 0.03);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  /**
   * Close near-miss overtake whoosh sound
   */
  public playNearMissWhoosh() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 0.35;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(250, now + duration);
    filter.Q.setValueAtTime(3.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  /**
   * Collision crash impact
   */
  public playCrashImpact() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Deep sub boom
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    // Crunch metal noise
    const duration = 0.8;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    subOsc.start(now);
    noise.start(now);
    subOsc.stop(now + 0.65);
  }

  public stopEngine() {
    if (this.engineOsc1) {
      try {
        this.engineOsc1.stop();
        this.engineOsc1.disconnect();
      } catch {}
      this.engineOsc1 = null;
    }
    if (this.engineOsc2) {
      try {
        this.engineOsc2.stop();
        this.engineOsc2.disconnect();
      } catch {}
      this.engineOsc2 = null;
    }
    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      } catch {}
      this.noiseNode = null;
    }
    this.isEngineRunning = false;
  }

  public dispose() {
    this.stopEngine();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioManager = new AudioManager();
