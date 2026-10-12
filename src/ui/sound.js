/**
 * Sound effects, synthesised in the browser: no files, nothing to precache,
 * no network request. Design: docs/design/B-sound.md §3.2; INSTRUMENT "Sound".
 *
 * Every note is an oscillator into its own exponential gain envelope, through
 * the cue's optional filter, into one master gain (On 0.70, Soft 0.25; Off
 * never creates an AudioContext). One cue at a time: a new cue cuts the last.
 *
 * Only ever called from inside a click or keydown handler — that is what lets
 * iOS start audio, and it is also the rule: a sound answers a tap that settled
 * a question or closed a lesson, never navigation, sync or reading. Web Audio
 * follows the iPhone's silent switch, which is the intended behaviour.
 *
 * Nothing here may throw: headless tests click without user activation, and a
 * context that will not start simply plays nothing.
 */
const LEVELS = { on: 0.70, soft: 0.25, off: 0 };

// frequency Hz, start ms, attack ms, end ms (from the cue's start), peak, wave
const n = (f, at, a, e, p, w = 'triangle') => ({ f, at, a, e, p, w });
const RIGHT = [n(880.00, 0, 5, 110, 0.30), n(1318.51, 75, 5, 245, 0.30)];
const FINISH = [n(523.25, 0, 5, 160, 0.22), n(659.26, 90, 5, 250, 0.22),
                n(783.99, 180, 5, 340, 0.22), n(1046.50, 270, 5, 790, 0.24)];

export const CUES = {
  right: { notes: RIGHT },                                             // two-note rise
  wrong: { notes: [n(392.00, 0, 8, 140, 0.26), n(311.13, 110, 8, 310, 0.26)], lowpass: 1400 },  // soft fall
  combo: { notes: [...RIGHT, n(1760.00, 150, 5, 410, 0.26), n(3520, 150, 5, 350, 0.05, 'sine')] },
  finish: { notes: FINISH },                                           // lesson closes
  milestone: { notes: [...FINISH, n(1046.50, 380, 20, 1480, 0.12), n(1318.51, 380, 20, 1480, 0.12),
                       n(1567.98, 380, 20, 1480, 0.12)] }              // + a held chord
};

export function makeSound(getLevel) {
  let ctx = null, master = null, voices = [];
  const lastAt = {};

  function ensure() {
    if (ctx) return ctx;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    return ctx;
  }

  function play(name) {
    try {
      const cue = CUES[name];
      const level = getLevel();
      if (!cue || !LEVELS[level]) return;
      const now = performance.now();
      if (now - (lastAt[name] || -1e9) < 60) return;      // one tap, one cue
      lastAt[name] = now;
      if (!ensure()) return;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      master.gain.value = LEVELS[level];
      const t0 = ctx.currentTime + 0.005;
      for (const v of voices) {                            // one cue at a time
        try {
          if (v.s >= t0) { v.o.stop(t0); continue; }
          v.g.gain.cancelScheduledValues(t0);
          v.g.gain.setTargetAtTime(0, t0, 0.005);
          v.o.stop(t0 + 0.03);
        } catch (e) { /* already stopped */ }
      }
      voices = [];
      let dest = master;
      if (cue.lowpass) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = cue.lowpass; f.Q.value = 0.707;
        f.connect(master); dest = f;
      }
      for (const x of cue.notes) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = x.w; o.frequency.value = x.f;
        const s = t0 + x.at / 1000, e = t0 + x.e / 1000;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(x.p, s + x.a / 1000);
        g.gain.exponentialRampToValueAtTime(0.0001, e);
        o.connect(g); g.connect(dest);
        o.start(s); o.stop(e + 0.02);
        voices.push({ o, g, s });
      }
    } catch (e) { /* sound is never worth an error */ }
  }

  return { play };
}
