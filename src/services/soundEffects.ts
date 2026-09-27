/**
 * Web Audio API synthesizer for restaurant kitchen & server chimes.
 * Works without external MP3 files and zero latency.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  try {
    localStorage.setItem('moonshine_sound_enabled', String(enabled));
  } catch {
    // Ignore storage errors
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('moonshine_sound_enabled');
    if (stored !== null) return stored === 'true';
  }
  return soundEnabled;
}

/**
 * Play a bright, unmistakable restaurant kitchen order bell ("Ding Ding!").
 */
export function playKitchenOrderBell() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // First chime
  playTone(ctx, 880, now, 0.45, 0.3);
  playTone(ctx, 1760, now, 0.35, 0.15); // overtone

  // Second chime slightly higher
  playTone(ctx, 1174.66, now + 0.18, 0.6, 0.35);
  playTone(ctx, 2349.32, now + 0.18, 0.5, 0.15); // overtone
}

/**
 * Trigger vibration on mobile phone (supported in Android Chrome/Firefox/PWA).
 */
export function triggerPhoneVibration(pattern: number[] = [300, 150, 300, 150, 500]) {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error if not supported/allowed by browser
    }
  }
}

/**
 * Play uplifting pickup alert for Server ("Order ready!") and vibrate phone.
 */
export function playOrderReadyChime() {
  triggerPhoneVibration([300, 150, 300, 150, 500]);
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Arpeggio: C5 -> E5 -> G5 -> C6
  playTone(ctx, 523.25, now, 0.25, 0.2);
  playTone(ctx, 659.25, now + 0.1, 0.25, 0.2);
  playTone(ctx, 783.99, now + 0.2, 0.35, 0.25);
  playTone(ctx, 1046.50, now + 0.32, 0.5, 0.3);
}

/**
 * Subtler punch confirmation click/beep
 */
export function playPunchSuccessSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  playTone(ctx, 600, now, 0.08, 0.15, 'triangle');
  playTone(ctx, 900, now + 0.07, 0.12, 0.2, 'triangle');
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine'
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (err) {
    console.warn('Audio tone play error:', err);
  }
}
