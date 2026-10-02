// Keeps the sound alive on phones and tablets. An alarm, a phone call or a
// trip to another app stops the AudioContext ('interrupted' on iOS,
// 'suspended' elsewhere) and browsers never start it again on their own, so
// without this the rest of the session would stay silent.
//
//  - page hidden → suspend on purpose (music pauses while the player is away)
//  - page shown again / focus / pageshow → resume
//  - any tap, click or key while stopped → resume from inside the gesture
//    (iOS only lets a gesture restart audio), plus a one-sample silent buffer
//    that wakes the audio session up
//  - while the page is visible and the sound is still stopped, retry once a
//    second (an alarm dismissed without touching the page)

import { audioCtx } from './engine';

let installed = false;
let everRan = false;

/**
 * False while the system has stopped the sound. SFX and blips are skipped
 * then, so they don't all fire at once when the sound comes back.
 */
export function soundLive(): boolean {
  const c = audioCtx();
  if (!c) return false;
  return c.state === 'running' || !everRan;
}

function tryResume(kick: boolean): void {
  const c = audioCtx();
  if (!c || document.hidden || c.state === 'running' || c.state === 'closed') return;
  c.resume().catch(() => {
    /* not allowed yet: the next gesture or retry tries again */
  });
  if (!kick) return;
  try {
    const s = c.createBufferSource();
    s.buffer = c.createBuffer(1, 1, c.sampleRate);
    s.connect(c.destination);
    s.start();
  } catch {
    /* context not usable yet */
  }
}

export function installKeepAlive(): void {
  const c = audioCtx();
  if (installed || !c) return;
  installed = true;
  if (c.state === 'running') everRan = true;
  c.addEventListener('statechange', () => {
    if (c.state === 'running') everRan = true;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) c.suspend().catch(() => {});
    else tryResume(false);
  });
  window.addEventListener('pageshow', () => tryResume(false));
  window.addEventListener('focus', () => tryResume(false));
  const onGesture = () => tryResume(true);
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'keydown', 'click'])
    window.addEventListener(ev, onGesture, { capture: true, passive: true });
  window.setInterval(() => tryResume(false), 1000);
}
