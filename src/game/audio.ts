/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * High-Fidelity Procedural Web Audio API Engine for Bangladeshi Highway Bus Simulator.
 *
 * Implements:
 * 1. Authentic 6-Cylinder Turbo Diesel Bus Engine (Hino / Scania / Volvo intercity coach):
 *    - Low-frequency diesel combustion knock pulse train (32 Hz idle to 115 Hz redline)
 *    - Heavy iron engine block sub-bass chassis rumble (40 - 75 Hz)
 *    - Turbocharger compressor spool whine (1.2 kHz - 3.6 kHz) under throttle load
 *    - Turbo wastegate / blow-off valve pressure purge hiss on throttle release
 *    - Dynamic amplitude modulation for authentic diesel "thump-thump" stroke cadence
 *
 * 2. Authentic Bangladeshi Hydraulic Air Horn (পম্পা / মিউজিক্যাল ইলেকট্রিক এয়ার হর্ন):
 *    - Tuned triple-trumpet brass chords (F-A-C harmonic sequence)
 *    - High-pressure compressed air strike transient (filtered noise attack)
 *    - Pneumatic diaphragm flutter & brass saturation waveshaper
 *    - Iconic multi-note intercity highway fanfare cadence
 *
 * 3. Pneumatic Air Brake Release Hiss ("TSSSS-KSHHH!")
 * 4. Mechanical Turn Indicator Relay (Tick... Tock...)
 * 5. Dynamic Near-Miss Whoosh and Heavy Crash Impact
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine Synthesis Nodes
  private isEngineRunning: boolean = false;
  private engineKnockOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineHarmonicOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Turbocharger Nodes
  private turboOsc: OscillatorNode | null = null;
  private turboFilter: BiquadFilterNode | null = null;
  private turboGain: GainNode | null = null;
  private lastThrottle: number = 0;

  // Engine Combustion Modulator (Diesel Stroke Cadence)
  private strokeLfo: OscillatorNode | null = null;
  private strokeLfoGain: GainNode | null = null;

  // Exhaust / Chassis Rumble Noise
  private rumbleSource: AudioBufferSourceNode | null = null;
  private rumbleGain: GainNode | null = null;

  // Waveshaper for brass horn warmth
  private distortionNode: WaveShaperNode | null = null;

  private lastIndicatorTickTime: number = 0;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.85;
      this.masterGain.connect(this.ctx.destination);

      // Create warm saturation curve for brass horn and diesel crunch
      this.distortionNode = this.ctx.createWaveShaper();
      this.distortionNode.curve = this.makeDistortionCurve(18);
      this.distortionNode.oversample = '2x';
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private makeDistortionCurve(k: number = 20): Float32Array<ArrayBuffer> {
    const n = 512;
    const buffer = new ArrayBuffer(n * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
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
   * Start the continuous heavy diesel bus engine sound.
   */
  public startEngine() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isEngineRunning) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Primary Diesel Combustion Knock (Sawtooth with steep low-pass)
      this.engineKnockOsc = this.ctx.createOscillator();
      this.engineKnockOsc.type = 'sawtooth';
      this.engineKnockOsc.frequency.setValueAtTime(32, now); // ~650 RPM idle knock (32 Hz)

      // 2. Heavy Sub-Bass Chassis Vibration (Pure sine wave at fundamental)
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'sine';
      this.engineSubOsc.frequency.setValueAtTime(38, now);

      // 3. Engine Cylinder Harmonic Displacement (Triangle wave at 2nd harmonic)
      this.engineHarmonicOsc = this.ctx.createOscillator();
      this.engineHarmonicOsc.type = 'triangle';
      this.engineHarmonicOsc.frequency.setValueAtTime(64, now);

      // 4. Diesel Stroke Modulation LFO (Gives the distinctive rhythmic chug of a big inline-6)
      this.strokeLfo = this.ctx.createOscillator();
      this.strokeLfo.type = 'sawtooth';
      this.strokeLfo.frequency.setValueAtTime(12, now); // 12-35 Hz stroke pulse rate

      this.strokeLfoGain = this.ctx.createGain();
      this.strokeLfoGain.gain.setValueAtTime(0.35, now);
      this.strokeLfo.connect(this.strokeLfoGain);

      // 5. Heavy Engine Compartment Acoustic Filter (Low-pass with resonance)
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(220, now);
      this.engineFilter.Q.setValueAtTime(3.2, now);

      // 6. Engine Main Gain
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.32, now);

      this.engineKnockOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineGain);
      this.engineHarmonicOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineKnockOsc.start(now);
      this.engineSubOsc.start(now);
      this.engineHarmonicOsc.start(now);
      this.strokeLfo.start(now);

      // 7. Turbocharger Spool Whine (High-frequency turbine whistling under boost)
      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = 'sine';
      this.turboOsc.frequency.setValueAtTime(1400, now);

      this.turboFilter = this.ctx.createBiquadFilter();
      this.turboFilter.type = 'bandpass';
      this.turboFilter.frequency.setValueAtTime(1800, now);
      this.turboFilter.Q.setValueAtTime(5.5, now);

      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0.005, now); // almost inaudible at idle

      this.turboOsc.connect(this.turboFilter);
      this.turboFilter.connect(this.turboGain);
      this.turboGain.connect(this.masterGain);
      this.turboOsc.start(now);

      // 8. Low-Frequency Road & Exhaust Rumbling Noise
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.rumbleSource = this.ctx.createBufferSource();
      this.rumbleSource.buffer = noiseBuffer;
      this.rumbleSource.loop = true;

      const rumbleFilter = this.ctx.createBiquadFilter();
      rumbleFilter.type = 'bandpass';
      rumbleFilter.frequency.setValueAtTime(110, now);
      rumbleFilter.Q.setValueAtTime(2.2, now);

      this.rumbleGain = this.ctx.createGain();
      this.rumbleGain.gain.setValueAtTime(0.09, now);

      this.rumbleSource.connect(rumbleFilter);
      rumbleFilter.connect(this.rumbleGain);
      this.rumbleGain.connect(this.masterGain);
      this.rumbleSource.start(now);

      this.isEngineRunning = true;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Update engine sound dynamically with speed (0-140 km/h) and throttle (0 to 1).
   */
  public updateEngine(speedKmh: number, throttle: number) {
    if (!this.ctx || !this.isEngineRunning) return;

    const now = this.ctx.currentTime;
    const speedRatio = Math.min(speedKmh / 135, 1.15);

    // Dynamic diesel RPM mapping
    // Idle: ~32 Hz. Top gear redline: ~110 Hz
    const knockFreq = 32 + speedRatio * 65 + throttle * 18;
    const subFreq = 38 + speedRatio * 32;
    const harmonicFreq = knockFreq * 2;
    const lfoFreq = 12 + speedRatio * 24;

    // Filter opens up as engine works harder
    const filterFreq = 210 + speedRatio * 320 + throttle * 280;
    const volume = 0.28 + speedRatio * 0.16 + throttle * 0.12;

    if (this.engineKnockOsc) this.engineKnockOsc.frequency.setTargetAtTime(knockFreq, now, 0.08);
    if (this.engineSubOsc) this.engineSubOsc.frequency.setTargetAtTime(subFreq, now, 0.08);
    if (this.engineHarmonicOsc) this.engineHarmonicOsc.frequency.setTargetAtTime(harmonicFreq, now, 0.08);
    if (this.strokeLfo) this.strokeLfo.frequency.setTargetAtTime(lfoFreq, now, 0.08);
    if (this.engineFilter) this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(volume, now, 0.08);

    // Turbocharger Spool Whine (Scales with throttle and speed)
    if (this.turboOsc && this.turboFilter && this.turboGain) {
      const turboPitch = 1400 + throttle * 2200 + speedRatio * 800;
      const turboVol = Math.max(0.005, throttle * 0.16 + speedRatio * 0.05);

      this.turboOsc.frequency.setTargetAtTime(turboPitch, now, 0.12);
      this.turboFilter.frequency.setTargetAtTime(turboPitch * 1.1, now, 0.12);
      this.turboGain.gain.setTargetAtTime(turboVol, now, 0.1);

      // Turbo wastegate blow-off hiss upon throttle lift-off at high speed
      if (this.lastThrottle > 0.8 && throttle < 0.2 && speedKmh > 40) {
        this.playTurboBlowOff();
      }
    }

    if (this.rumbleGain) {
      const rumbleVol = 0.08 + speedRatio * 0.14;
      this.rumbleGain.gain.setTargetAtTime(rumbleVol, now, 0.1);
    }

    this.lastThrottle = throttle;
  }

  /**
   * Turbo Wastegate Blow-off Valve Hiss ("pshh-t-t-t!")
   */
  private playTurboBlowOff() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 0.28;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + duration);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  /**
   * Authentic Bangladeshi Hydraulic Multi-Trumpet Air Horn (পম্পা / ইলেকট্রিক এয়ার হর্ন)
   *
   * Features:
   * - Compressed air attack strike transient (high-pressure burst)
   * - Tuned 3-trumpet brass chords (F4-A4-C5 / G4-B4-D5) with rich harmonic saturation
   * - Pneumatic 7 Hz diaphragm flutter
   * - Authentic intercity coach musical fanfare cadence ("POOMP-POOMP... POOOOMP!")
   */
  public playBanglaAirHorn() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Rhythmic Bangladeshi intercity bus fanfare phrase (Green Line / Hanif / Shohagh style):
    // 1st blast (staccato), 2nd blast (staccato), 3rd grand crescendo blast (sustained)
    const blasts = [
      { start: 0.0, duration: 0.11, rootFreq: 349.23 }, // F4
      { start: 0.13, duration: 0.11, rootFreq: 392.0 }, // G4
      { start: 0.27, duration: 0.42, rootFreq: 440.0 }, // A4 - long ringing fanfare
    ];

    blasts.forEach((blast) => {
      if (!this.ctx || !this.masterGain) return;
      const tStart = now + blast.start;
      const tDur = blast.duration;

      // 1. High-pressure air strike transient (filtered white noise burst)
      const airNoiseSize = Math.floor(this.ctx.sampleRate * 0.04);
      const airBuffer = this.ctx.createBuffer(1, airNoiseSize, this.ctx.sampleRate);
      const airData = airBuffer.getChannelData(0);
      for (let i = 0; i < airNoiseSize; i++) {
        airData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.015));
      }

      const airNode = this.ctx.createBufferSource();
      airNode.buffer = airBuffer;

      const airFilter = this.ctx.createBiquadFilter();
      airFilter.type = 'highpass';
      airFilter.frequency.setValueAtTime(1500, tStart);

      const airGain = this.ctx.createGain();
      airGain.gain.setValueAtTime(0.28, tStart);
      airGain.gain.linearRampToValueAtTime(0.001, tStart + 0.04);

      airNode.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(this.masterGain);
      airNode.start(tStart);

      // 2. Triple-Trumpet Brass Harmonic Chime (Root, Major Third, Fifth)
      // Produces the loud, piercing, ringing brass resonance of compressed air horns
      const chord = [
        blast.rootFreq, // Trumpet 1 (Low)
        blast.rootFreq * 1.2599, // Trumpet 2 (Major Third)
        blast.rootFreq * 1.4983, // Trumpet 3 (Fifth)
      ];

      chord.forEach((freq) => {
        if (!this.ctx || !this.masterGain) return;

        // Rich sawtooth oscillator for heavy brass harmonics
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, tStart);

        // Pneumatic diaphragm pressure flutter (6.5 Hz vibrato)
        const flutterLfo = this.ctx.createOscillator();
        flutterLfo.frequency.setValueAtTime(6.5, tStart);
        const flutterGain = this.ctx.createGain();
        flutterGain.gain.setValueAtTime(4.5, tStart);
        flutterLfo.connect(flutterGain);
        flutterGain.connect(osc.frequency);
        flutterLfo.start(tStart);
        flutterLfo.stop(tStart + tDur);

        // Brass Formant Resonant Filter (Emulates trumpet metal bell acoustics)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 1.5, tStart);
        filter.Q.setValueAtTime(3.8, tStart);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0, tStart);
        gain.gain.linearRampToValueAtTime(0.26, tStart + 0.015); // Instant pneumatic attack
        gain.gain.setValueAtTime(0.24, tStart + tDur - 0.02);
        gain.gain.linearRampToValueAtTime(0.001, tStart + tDur); // Crisp release

        osc.connect(filter);
        if (this.distortionNode) {
          filter.connect(this.distortionNode);
          this.distortionNode.connect(gain);
        } else {
          filter.connect(gain);
        }
        gain.connect(this.masterGain);

        osc.start(tStart);
        osc.stop(tStart + tDur);
      });
    });
  }

  /**
   * Pneumatic Air Brake Release Hiss ("TSSSS-KSHHH!")
   */
  public playAirBrakeHiss() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 0.52;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.22));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(650, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  /**
   * Turn Signal Indicator Relay Click (Tick... Tock...)
   */
  public playIndicatorTick(isTock: boolean) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (now - this.lastIndicatorTickTime < 0.22) return;
    this.lastIndicatorTickTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isTock ? 780 : 940, now);
    osc.frequency.exponentialRampToValueAtTime(isTock ? 320 : 410, now + 0.028);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Close Near-Miss Overtake Whoosh Sound
   */
  public playNearMissWhoosh() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 0.38;

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
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + duration * 0.45);
    filter.frequency.exponentialRampToValueAtTime(220, now + duration);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + duration * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  /**
   * Heavy Vehicle Crash Collision Impact
   */
  public playCrashImpact() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Sub-bass detonation thump
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.7);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.85, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    // Twisted metal and glass crunch noise
    const duration = 0.95;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    subOsc.start(now);
    noise.start(now);
    subOsc.stop(now + 0.75);
  }

  public stopEngine() {
    if (this.engineKnockOsc) {
      try {
        this.engineKnockOsc.stop();
        this.engineKnockOsc.disconnect();
      } catch {}
      this.engineKnockOsc = null;
    }
    if (this.engineSubOsc) {
      try {
        this.engineSubOsc.stop();
        this.engineSubOsc.disconnect();
      } catch {}
      this.engineSubOsc = null;
    }
    if (this.engineHarmonicOsc) {
      try {
        this.engineHarmonicOsc.stop();
        this.engineHarmonicOsc.disconnect();
      } catch {}
      this.engineHarmonicOsc = null;
    }
    if (this.strokeLfo) {
      try {
        this.strokeLfo.stop();
        this.strokeLfo.disconnect();
      } catch {}
      this.strokeLfo = null;
    }
    if (this.turboOsc) {
      try {
        this.turboOsc.stop();
        this.turboOsc.disconnect();
      } catch {}
      this.turboOsc = null;
    }
    if (this.rumbleSource) {
      try {
        this.rumbleSource.stop();
        this.rumbleSource.disconnect();
      } catch {}
      this.rumbleSource = null;
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
