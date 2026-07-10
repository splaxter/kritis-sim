/**
 * Prozeduraler Sound für den Story-Modus — Web Audio API, keine Asset-Dateien.
 * Opt-in: Default stumm; [M] toggelt, Zustand in localStorage.
 * Alle WebAudio-Aufrufe sind geguardet (jsdom/ältere Browser → No-op).
 */

export const SOUND_PREF_KEY = 'kritis_sound';

type Cue = 'stinger';

/** Alarm-Stinger bei Vorfalls-Events (Tags aus story-events.ts). */
export function cueForEvent(tags: string[] | undefined): Cue | null {
  if (!tags) return null;
  return tags.includes('incident') || tags.includes('compromise') ? 'stinger' : null;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambienceNodes: AudioNode[] = [];
  private enabled = false;

  constructor() {
    this.enabled = typeof localStorage !== 'undefined' && localStorage.getItem(SOUND_PREF_KEY) === 'on';
  }

  isEnabled() {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SOUND_PREF_KEY, this.enabled ? 'on' : 'off');
    }
    if (this.enabled) this.startAmbience();
    else this.stopAmbience();
    return this.enabled;
  }

  /** Lazy: AudioContext erst bei erster aktivierter Nutzung (Autoplay-Policy). */
  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.12; // ≈ −18 dB, bewusst leise
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Regen (gefiltertes Rauschen) + Raum-Brummen (tiefer Oszillator). */
  private startAmbience() {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master || this.ambienceNodes.length) return;

    const noiseLen = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 900;
    rainFilter.Q.value = 0.6;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.25;
    noise.connect(rainFilter).connect(rainGain).connect(this.master);
    noise.start();

    const humGain = ctx.createGain();
    humGain.gain.value = 0.1;
    humGain.connect(this.master);
    for (const freq of [55, 55.7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(humGain);
      osc.start();
      this.ambienceNodes.push(osc);
    }
    this.ambienceNodes.push(noise, rainFilter, rainGain, humGain);
  }

  private stopAmbience() {
    for (const n of this.ambienceNodes) {
      if ('stop' in n) {
        try { (n as AudioScheduledSourceNode).stop(); } catch { /* already stopped */ }
      }
      n.disconnect();
    }
    this.ambienceNodes = [];
  }

  /** Kurzer Blip bei Auswahlwechsel. */
  tick() { this.blip(1200, 0.03, 0.04); }
  /** Weicher Klick bei Bestätigung. */
  confirm() { this.blip(600, 0.06, 0.08); }
  /** Alarm-Stinger: zwei fallende Töne. */
  stinger() {
    this.blip(440, 0.25, 0.18);
    setTimeout(() => this.blip(330, 0.35, 0.18), 180);
  }

  private blip(freq: number, duration: number, gain: number) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  /** Nur für Tests. */
  _resetForTests() {
    this.stopAmbience();
    this.ctx = null;
    this.master = null;
    this.enabled = typeof localStorage !== 'undefined' && localStorage.getItem(SOUND_PREF_KEY) === 'on';
  }
}

export const soundEngine = new SoundEngine();
