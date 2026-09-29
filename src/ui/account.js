/**
 * Sync in the interface: the SYNC panel in Settings, the dot and the notice on
 * Today, and the sign-in form.
 *
 * Only the dot shows on Today while sync works: the online copy is the backup,
 * so the backup-code reminder steps aside too. The form lives outside #app on
 * purpose: #app is rebuilt from a string on every change, which would wipe a
 * half-typed password.
 */
import { esc } from './views.js';

const gl = en => `<div class="gl">${esc(en)}</div>`;
/** A gloss that keeps its capitals: an email address, an error code. */
const glRaw = text => `<div class="gl raw">${esc(text)}</div>`;
const changes = n => `${n} ${n === 1 ? 'change' : 'changes'}`;

/** Why sync stopped, and what to do about it. */
export function problem(st) {
  const hint = /permission/.test(st.error)
    ? 'The database refused access: publish the rules (SYNC.md, step 1), then tap Try again.'
    : 'Progress is kept on this device and goes up once sync works again.';
  return `${st.error}. ${hint}`;
}

function describe(st) {
  const signIn = '<button class="btn primary" data-act="sync-sign-in">Sign in</button>';
  const signOut = '<button class="btn ghost slim" data-act="sync-sign-out">Sign out</button>';
  const saved = st.waiting ? `${changes(st.waiting)} saved here` : '';
  if (st.mode === 'error') {
    return {
      key: 'error', spine: 'red', tone: 'red', status: 'NOT SYNCING', note: glRaw(problem(st)),
      actions: `<button class="btn secondary" data-act="sync-retry">Try again</button>${st.email ? signOut : ''}`
    };
  }
  if (!st.claimed && st.mode !== 'connecting') {
    return {
      key: 'off', spine: '', tone: '', status: 'OFF', actions: signIn,
      note: gl('sign in with your life hub email and password. what is on this device is combined with the online copy — nothing is lost')
    };
  }
  if (st.mode === 'signed-out') {
    return {
      key: 'signed-out', spine: 'red', tone: 'red', status: 'SIGNED OUT', actions: signIn,
      note: gl(saved ? `${saved} — sign in to send them` : 'sign in to keep this device in step')
    };
  }
  if (st.mode === 'connecting' || st.mode === 'starting') {
    return {
      key: 'connecting', spine: 'blue', tone: '', status: 'CONNECTING', actions: '',
      note: st.email ? glRaw(`signed in as ${st.email}`) : gl('reaching the online copy')
    };
  }
  if (st.offline) {
    return {
      key: 'offline', spine: 'blue', tone: '', status: 'OFFLINE', actions: '',
      note: gl(saved ? `${saved} — they go up by themselves once you are online` : 'progress is saved here and goes up once you are online')
    };
  }
  return {
    key: 'on', spine: 'blue', tone: 'blue', status: st.waiting && st.slow ? 'SYNCING' : 'ON', actions: signOut,
    note: glRaw(`signed in as ${st.email}`) + gl('every lesson goes up by itself — each device you sign in on shows the same progress')
  };
}

/** Settings → SYNC, the page's first section. */
export function syncPanel(st) {
  if (st.mode === 'off') return '';
  const s = describe(st);
  return `<div class="h" style="margin-top:10px"><span class="mono">SYNC</span></div>
    <div class="panel${s.spine ? ' ' + s.spine : ''}" data-sync="${s.key}">
      <div class="wline">
        <div style="flex:1"><div class="mn">Online sync</div>${s.note}</div>
        <div class="mono${s.tone ? ' ' + s.tone : ''}">${s.status}</div>
      </div>
      ${s.actions ? `<div class="inline" style="margin-top:10px">${s.actions}</div>` : ''}
    </div>`;
}

// The dot's colour for each state of the panel above. Red only when it needs
// you; on its way (connecting, offline, a change still going up) is a ring.
const DOT = { error: 'red', off: 'red', 'signed-out': 'red', connecting: 'wait', offline: 'wait', on: 'on' };

/**
 * Sync at a glance, top right of Today: the panel's state as a dot, so a
 * device that isn't in step can't go unnoticed. Blue like the panel's ON, not
 * green: green only ever means a right answer (INSTRUMENT). Tapping it opens
 * Settings, which says why in words.
 */
export function syncDot(st) {
  if (st.mode === 'off') return '';
  const s = describe(st);
  const tone = s.status === 'SYNCING' ? 'wait' : DOT[s.key];
  const label = `Sync: ${s.status.toLowerCase()}`;
  return `<button class="syncdot ${tone}" data-act="tab" data-tab="settings" title="${label}" aria-label="${label}, open settings"></button>`;
}

function notice(title, note, status) {
  return `<div class="panel red" data-notice="sync">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div><div style="font-size:14px;font-weight:600">${esc(title)}</div>${gl(note)}</div>
      <div class="mono red">${status}</div>
    </div>
  </div>`;
}

/**
 * The top of Today. `backup` is the backup-code reminder, which only applies
 * while this device doesn't sync: once it does, the online copy is the
 * backup, and nothing shows unless sync itself needs attention.
 */
export function todayNotice(st, backup) {
  if (st.mode === 'error') return notice('Not syncing', 'open settings for the reason — progress is kept on this device meanwhile', 'SYNC');
  if (!st.claimed) return backup;
  if (st.mode === 'signed-out') {
    return notice('Signed out of sync',
      st.waiting ? `${changes(st.waiting)} saved here — sign in under settings to send them` : 'sign in under settings to keep syncing',
      'SYNC');
  }
  return '';
}

// ---- the sign-in form -----------------------------------------------------

const MESSAGES = {
  'auth/invalid-credential': 'That email and password don’t match.',
  'auth/wrong-password': 'That email and password don’t match.',
  'auth/user-not-found': 'That email and password don’t match.',
  'auth/invalid-email': 'That doesn’t look like an email address.',
  'auth/missing-password': 'Type your password too.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes, then try again.',
  'auth/network-request-failed': 'No internet connection. Try again once you’re online.',
  'auth/user-disabled': 'This account is switched off in the Firebase console.'
};
const explain = e => MESSAGES[e && e.code] || `Couldn’t sign in (${(e && (e.code || e.message)) || e}).`;

const FORM = `
<form class="signin-card panel" novalidate>
  <div class="mono">MONGOLIAN · SYNC</div>
  <h1 id="signin-title">Sign in</h1>
  <div class="gl">your life hub email and password — one account keeps both apps in step on every device</div>
  <label class="field"><span class="mono">EMAIL</span>
    <input class="text" name="email" type="email" autocomplete="username" autocapitalize="off" spellcheck="false"></label>
  <label class="field"><span class="mono">PASSWORD</span>
    <input class="text" name="password" type="password" autocomplete="current-password"></label>
  <div class="msg" role="alert" hidden></div>
  <div class="btns"><button class="btn primary" type="submit">Sign in</button></div>
  <div class="inline links">
    <button type="button" class="btn ghost slim" data-f="forgot">Forgot password?</button>
    <button type="button" class="btn ghost slim" data-f="cancel">Not now</button>
  </div>
</form>`;

let box = null;

function say(text, tone = 'error') {
  const m = box.querySelector('.msg');
  m.textContent = text;
  m.className = `msg ${tone}`;
  m.hidden = !text;
}

function build(sync) {
  box = document.createElement('div');
  box.className = 'signin';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'signin-title');
  box.innerHTML = FORM;
  document.body.append(box);
  const form = box.querySelector('form');
  const submit = form.querySelector('[type=submit]');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) return say('Type your email and your password.');
    submit.disabled = true;
    submit.textContent = 'Signing in…';
    say('');
    try {
      await sync.signIn(email, password);
      form.password.value = '';
      closeSignIn();
    } catch (err) {
      say(explain(err));
    } finally {
      submit.disabled = false;
      submit.textContent = 'Sign in';
    }
  });

  box.addEventListener('click', async e => {
    const f = e.target.closest('[data-f]');
    if (!f) return;
    if (f.dataset.f === 'cancel') return closeSignIn();
    const email = form.email.value.trim();
    if (!email) return say('Type your email above first, then tap “Forgot password?” again.');
    try {
      await sync.resetPassword(email);
      say(`If ${email} is your Life Hub account, an email with a link to choose a new password is on its way.`, 'info');
    } catch (err) {
      say(explain(err));
    }
  });

  box.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSignIn();
  });
}

export function openSignIn(sync) {
  if (!box) build(sync);
  if (!box.hidden) return;
  box.hidden = false;
  say('');
  // Same rule as the answer boxes: no keyboard popping up by itself on a phone.
  if (!('ontouchstart' in window)) box.querySelector('input[name=email]').focus();
}

export function closeSignIn() {
  if (box) box.hidden = true;
}

export const signInOpen = () => !!box && !box.hidden;
