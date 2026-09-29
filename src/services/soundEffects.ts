/**
 * High-impact Web Audio API synthesizer for restaurant kitchen & server chimes.
 * Specially tuned for loud kitchen environments (Android tablets) and dining floor (iPads).
 * Automatically unlocks iOS Safari and Android Chrome audio restrictions on first user gesture.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let isUnlocked = false;

// Initialize or get the AudioContext singleton
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

/**
 * Crucial for iOS (iPad) and Android: unlocks the browser AudioContext
 * by resuming it inside a user gesture and playing a silent buffer.
 */
export async function unlockAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    // Play a microscopic silent buffer to guarantee iOS Safari primes the hardware speaker
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    isUnlocked = ctx.state === 'running';
    return isUnlocked;
  } catch (err) {
    console.warn('Audio unlock warning:', err);
    return false;
  }
}

// Auto-attach unlock listeners on any early touch or click anywhere in the app
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown'];
  const handleInitialUserGesture = () => {
    unlockAudio();
    unlockEvents.forEach((evt) => {
      window.removeEventListener(evt, handleInitialUserGesture);
    });
  };

  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, handleInitialUserGesture, { once: false, passive: true });
  });
}

export function isAudioUnlocked(): boolean {
  return isUnlocked || (audioCtx !== null && audioCtx.state === 'running');
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  try {
    localStorage.setItem('moonshine_sound_enabled', String(enabled));
  } catch {
    // Ignore storage errors
  }
  if (enabled) {
    unlockAudio();
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
 * Triggers vibration on mobile/tablet devices (Supported in Android Chrome/PWA/Firefox).
 */
export function triggerPhoneVibration(pattern: number[] = [400, 200, 400, 200, 600]) {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error if not supported/allowed
    }
  }
}

/**
 * Helper to synthesize an authentic metallic bell strike with harmonics
 */
function playBellStrike(ctx: AudioContext, baseFreq: number, startTime: number, volume: number = 0.5) {
  // Real bells produce inharmonic overtones (~1x fundamental, ~2.76x overtone, ~5.4x chime sparkle)
  const harmonics = [
    { freq: baseFreq, gain: volume * 0.7, decay: 0.9 },
    { freq: baseFreq * 2.02, gain: volume * 0.4, decay: 0.7 },
    { freq: baseFreq * 2.76, gain: volume * 0.3, decay: 0.5 },
    { freq: baseFreq * 5.4, gain: volume * 0.15, decay: 0.3 },
  ];

  harmonics.forEach(({ freq, gain, decay }) => {
    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(gain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + decay);
    } catch {
      // Ignore audio synthesis errors
    }
  });
}

/**
 * LOUD Kitchen Order Bell (For Kitchen Android device when a waiter punches an order).
 * Distinct, high-presence triple restaurant bell strike: "DING! DING! DING!"
 * Designed to cut through loud kitchen hoods and background pan sizzling.
 */
export async function playKitchenOrderBell() {
  if (!isSoundEnabled()) return;
  await unlockAudio();
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1st Strike (880 Hz - High A)
  playBellStrike(ctx, 880, now, 0.75);

  // 2nd Strike (1046.5 Hz - High C)
  playBellStrike(ctx, 1046.5, now + 0.22, 0.85);

  // 3rd Loud Piercing Strike (1318.5 Hz - High E)
  playBellStrike(ctx, 1318.5, now + 0.46, 0.9);

  // Repeat sequence 1 second later for guaranteed awareness
  setTimeout(() => {
    const ctx2 = getAudioContext();
    if (!ctx2 || !isSoundEnabled()) return;
    const now2 = ctx2.currentTime;
    playBellStrike(ctx2, 880, now2, 0.65);
    playBellStrike(ctx2, 1174.66, now2 + 0.22, 0.75);
  }, 900);
}

/**
 * LOUD Pickup Alert (For Server iPad when Kitchen taps "Ready for Pickup").
 * Penetrating dual-tone service bell + fanfare arpeggio ("DING-DONG! DING-DONG! ORDER READY AT PASS!").
 * Also triggers mobile vibration.
 */
export async function playOrderReadyChime() {
  triggerPhoneVibration([500, 200, 500, 200, 800]);

  if (!isSoundEnabled()) return;
  await unlockAudio();
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Rapid ascending attention fanfare
  playTone(ctx, 587.33, now, 0.16, 0.45); // D5
  playTone(ctx, 739.99, now + 0.12, 0.16, 0.5); // F#5
  playTone(ctx, 880.00, now + 0.24, 0.2, 0.6); // A5
  playTone(ctx, 1174.66, now + 0.38, 0.4, 0.75); // D6

  // Loud, unmistakable service bell double strike
  playBellStrike(ctx, 1174.66, now + 0.55, 0.9);
  playBellStrike(ctx, 1479.98, now + 0.85, 0.95);

  // Echo chime after a moment so servers across the floor definitely hear it
  setTimeout(() => {
    const ctx2 = getAudioContext();
    if (!ctx2 || !isSoundEnabled()) return;
    const now2 = ctx2.currentTime;
    playBellStrike(ctx2, 1174.66, now2, 0.75);
    playBellStrike(ctx2, 1479.98, now2 + 0.25, 0.85);
  }, 1100);
}

/**
 * Subtle feedback sound when server taps or adds an item
 */
export function playPunchSuccessSound() {
  if (!isSoundEnabled()) return;
  unlockAudio();
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  playTone(ctx, 600, now, 0.07, 0.25, 'triangle');
  playTone(ctx, 950, now + 0.06, 0.1, 0.3, 'triangle');
}

/**
 * Test chime helper for Staff to verify speaker volume on iPad or Android
 */
export async function testAlertSound(type: 'kitchen' | 'ready') {
  await unlockAudio();
  if (type === 'kitchen') {
    playKitchenOrderBell();
  } else {
    playOrderReadyChime();
  }
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
