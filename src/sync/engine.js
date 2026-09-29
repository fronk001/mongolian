/**
 * Keeps this device's progress in step with the online copy: Firestore,
 * users/{uid}/mongolian/, in the same Firebase project and account as Life
 * Hub. The app keeps working exactly as before without it; this only adds.
 *
 * The rules, in order of importance:
 * - Nothing studied is lost. Every change made while signed in waits in
 *   storage until the database confirms it, so a lesson done offline, or
 *   before the database code has even loaded, goes up at the next chance.
 * - A device's first sign-in combines its progress with the online copy
 *   (mergeStates in core/sync.js). Whichever device signs in first, the
 *   other one's work is added to it, never thrown away.
 * - After that the database wins: what it holds replaces this device's copy,
 *   with this device's unsent changes laid on top.
 * - A change is re-applied on top of whatever the database holds when it
 *   goes up (rebase), so a lesson on the phone without signal and one on the
 *   laptop meanwhile both count.
 * - Nothing counts twice. Each change carries this device's running number,
 *   written in the same batch (main.seq), so a change that reached the
 *   database just before the app closed is recognised, not sent again.
 *
 * `backend` is firebase.js in the app, fake-backend.js in the tests:
 *   start(onUser)                resolves once loaded; onUser(user | null) on every change
 *   signIn(email, pw) · signOut() · resetPassword(email)
 *   listen(uid, onDocs, onError) onDocs({ docs, fromCache }); returns unsubscribe
 *   write(uid, writes)           [{ id, data, merge }], one atomic batch; resolves when stored
 *
 * The app hands over `state()` (its progress now) and `adopt(next)` (take
 * this newer version), and calls commit() after every change it saves.
 */
import { toDocs, fromDocs, diff, patchesFor, overlay, rebase, mergeStates } from '../core/sync.js';

// A change the database hasn't confirmed after this long shows as "syncing".
const SLOW_MS = 5000;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;

/** The database's documents minus main.seq, which is bookkeeping, not progress. */
function strip(docs) {
  const out = JSON.parse(JSON.stringify(docs || {}));
  if (out.main) delete out.main.seq;
  return out;
}

export function createSync({ storage, key, backend = null, state, adopt, idle = () => true }) {
  // { owner: uid this copy is in step with, device, seq: last number used,
  //   pending: [{ id, seq, at, ops, replace?, join? }] }
  const META = `${key}:sync`;
  let meta = null;
  let base = toDocs(state()); // the progress as last committed, laid out like the database
  let user = null;
  let mode = backend ? 'starting' : 'off';
  let error = '';
  let unlisten = null;
  let server = null;          // the database's documents as last heard, its cache included
  let fromCache = true;
  let sent = new Set();       // batches handed to the database by this page
  let stopped = false;
  const subs = new Set();
  const notify = () => subs.forEach(fn => fn());

  function saveMeta() {
    try { storage.setItem(META, JSON.stringify(meta)); } catch (e) { /* full or private: carry on */ }
  }
  // Re-read before every change: another tab may have queued changes too.
  function readMeta() {
    let stored = null;
    try { stored = JSON.parse(storage.getItem(META) || 'null'); } catch (e) { /* unreadable: start over */ }
    meta = { owner: null, seq: 0, pending: [], ...stored };
    if (!meta.device) {
      meta.device = newId();
      saveMeta();
    }
    return meta;
  }
  readMeta();

  const live = () => !!server && !fromCache && online();
  const canSend = () => !stopped && !!user && meta.owner === user.uid && live();

  // Sticky until the next sign-in: a refused write shouldn't be hidden by
  // the next good snapshot.
  function fail(e) {
    error = (e && (e.code || e.message)) || String(e);
    notify();
  }

  function send(batch) {
    sent.add(batch.id);
    const ops = [...batch.ops, { path: ['main', 'seq', meta.device], value: batch.seq }];
    backend.write(user.uid, patchesFor(ops, backend.DEL)).then(() => {
      readMeta();
      meta.pending = meta.pending.filter(b => b.id !== batch.id);
      saveMeta();
      notify();
    }, fail); // stays queued: the next start sends it again
    setTimeout(notify, SLOW_MS + 100);
  }

  // Everything still waiting goes up, each change re-applied on top of what
  // the database holds by then. For a change made while online that changes
  // nothing; for one made offline it is what lets both devices' work count.
  function flush() {
    if (!canSend()) return;
    let view = server;
    let touched = false;
    for (const b of meta.pending) {
      if (!sent.has(b.id)) {
        if (!b.replace) b.ops = rebase(b.ops, view);
        touched = true;
        send(b);
      }
      view = overlay(view, b.ops);
    }
    if (touched) saveMeta();
  }

  // The progress as this device should show it: the database's copy with
  // everything still waiting laid on top.
  function adoptView() {
    const next = fromDocs(overlay(strip(server), meta.pending.flatMap(b => b.ops)));
    const docs = toDocs(next);
    if (!diff(base, docs).length) return;
    base = docs;
    adopt(next);
  }

  // First contact between this device's copy and the online one (or the
  // online copy has gone: then this device's goes up again).
  function join(docs) {
    const merged = docs ? mergeStates(state(), fromDocs(strip(docs))) : state();
    const target = toDocs(merged);
    readMeta();
    meta.owner = user.uid;
    meta.seq += 1;
    // Everything this device ever did is inside `merged`, so nothing older
    // needs sending. If this batch never lands, the next start joins again.
    meta.pending = [{ id: newId(), seq: meta.seq, at: Date.now(), join: true, replace: true, ops: diff(strip(docs), target) }];
    saveMeta();
    if (diff(base, target).length) {
      base = target;
      adopt(merged);
    }
    mode = 'live';
    flush();
  }

  function onDocs(snap) {
    if (!user || stopped) return;
    server = snap.docs;
    fromCache = snap.fromCache;
    readMeta();
    if (live()) {
      // Sent before the app last closed, and it landed: it is in the
      // database already, and sending it again would count it twice.
      const landed = ((server.main || {}).seq || {})[meta.device] || 0;
      const kept = meta.pending.filter(b => sent.has(b.id) || b.seq > landed);
      if (kept.length !== meta.pending.length) {
        meta.pending = kept;
        saveMeta();
      }
    }
    const joined = meta.owner === user.uid && !meta.pending.some(b => b.join && !sent.has(b.id));
    if (!joined || !server.main) {
      // Only the database's own answer counts: an empty cache proves nothing.
      if (live()) join(server.main ? server : null);
      else if (!joined) mode = 'connecting';
      notify();
      return;
    }
    flush();
    adoptView();
    mode = 'live';
    notify();
  }

  function onUser(u) {
    if (stopped) return;
    if (unlisten) unlisten();
    unlisten = null;
    user = u;
    server = null;
    fromCache = true;
    sent = new Set();
    error = '';
    readMeta();
    if (!u) {
      mode = 'signed-out';
      notify();
      return;
    }
    mode = 'connecting';
    unlisten = backend.listen(u.uid, onDocs, fail);
    notify();
  }

  // No connection to fetch the database code: carry on locally, and try
  // again when the connection comes back or the app comes back into view.
  // On the real backend that second try reloads the page, so it also waits
  // for `idle()` (no lesson under way), and it needs a fresh reason each
  // time: a failed try never schedules another by itself.
  let armed = false;
  function retry() {
    if (!armed || mode !== 'offline' || !online() || document.hidden || !idle()) return;
    armed = false;
    start();
  }
  function arm() {
    if (mode !== 'offline' || document.hidden) return;
    armed = true;
    retry();
  }

  function start() {
    mode = 'starting';
    backend.start(onUser).catch(() => {
      mode = 'offline';
      notify();
    });
  }

  const back = () => { arm(); flush(); notify(); };
  if (backend) {
    addEventListener('online', back);
    addEventListener('offline', notify);
    document.addEventListener('visibilitychange', arm);
  }

  return {
    /** Load the database code and sign in if this device already was. After the first paint. */
    start() {
      if (backend) start();
    },

    /** After every change the app saves. `replace`: an imported code, not rebased onto anything. */
    commit(p, { replace = false } = {}) {
      const next = toDocs(p);
      const ops = diff(base, next);
      base = next;
      if (!ops.length) return;
      readMeta();
      if (!meta.owner) return; // never synced here: the first sign-in takes it all along
      meta.seq += 1;
      meta.pending.push({ id: newId(), seq: meta.seq, at: Date.now(), ops, ...(replace ? { replace: true } : {}) });
      saveMeta();
      flush();
      notify();
    },

    status() {
      const oldest = meta.pending.length ? meta.pending[0].at : null;
      return {
        mode: error ? 'error' : mode, // off starting offline signed-out connecting live error
        email: user ? user.email : '',
        claimed: !!meta.owner,
        waiting: meta.pending.length,
        offline: mode === 'offline' || !online() || (mode === 'live' && fromCache),
        slow: oldest !== null && Date.now() - oldest > SLOW_MS,
        error,
      };
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },

    signIn: (email, password) => backend.signIn(email, password),
    resetPassword: email => backend.resetPassword(email),

    // Stops syncing this device. Its progress stays here, and signing in
    // again combines it with the online copy, like the first time.
    async signOut() {
      await backend.signOut();
      readMeta();
      meta.owner = null;
      meta.pending = [];
      saveMeta();
      notify();
    },

    /** The app is idle again: a good moment for a retry that may reload the page. */
    poke: retry,

    /** Everything off: what closing the app does. For the tests, which open several. */
    stop() {
      stopped = true;
      if (unlisten) unlisten();
      removeEventListener('online', back);
      removeEventListener('offline', notify);
      document.removeEventListener('visibilitychange', arm);
    },
  };
}
