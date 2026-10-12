/**
 * Settings that belong to one device, not to the learner: how loud the
 * laptop at a desk should be is not how loud the phone on a train should be.
 *
 * Kept under `${KEY}:prefs`, beside the progress but never inside it, so they
 * are not synced, not in a backup code, and an import never resets them.
 * Storage may be missing or full (private browsing); every read falls back
 * to the default and every write may silently do nothing.
 */
const DEFAULTS = { sound: 'on' };

export function makePrefs(storage, key) {
  const k = `${key}:prefs`;
  let cache;
  const read = () => {
    if (cache) return cache;
    try { cache = { ...DEFAULTS, ...JSON.parse(storage.getItem(k) || '{}') }; }
    catch (e) { cache = { ...DEFAULTS }; }
    return cache;
  };
  return {
    get: name => read()[name],
    set(name, value) {
      read()[name] = value;
      try { storage.setItem(k, JSON.stringify(cache)); } catch (e) { /* not kept */ }
    }
  };
}
