// Ember Court — sound, synthesized, no audio files.
// Tiny WebAudio blips: a pluck when a card is played, a tick on a draw, a
// low thud on damage, a soft chime on shield, an arpeggio on a win. The
// table is silent until the player first interacts (browser policy), and
// M or the Sound button mutes it.

let ctx = null;
let muted = false;

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

function audio() {
  if (muted) return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq, dur, type, gain, when = 0) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, ac.currentTime + when);
  amp.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(ac.currentTime + when);
  osc.stop(ac.currentTime + when + dur + 0.02);
}

export const sfx = {
  play() { tone(520, 0.12, 'triangle', 0.12); tone(780, 0.1, 'triangle', 0.08, 0.05); },
  draw() { tone(880, 0.05, 'sine', 0.06); },
  damage() { tone(140, 0.18, 'sawtooth', 0.1); tone(90, 0.22, 'sawtooth', 0.08, 0.03); },
  shield() { tone(660, 0.14, 'sine', 0.09); tone(990, 0.16, 'sine', 0.06, 0.07); },
  heal() { tone(440, 0.16, 'sine', 0.08); tone(660, 0.2, 'sine', 0.07, 0.08); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, i * 0.12)); },
  loss() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.1, i * 0.14)); },
  turn() { tone(440, 0.08, 'sine', 0.07); },
};
