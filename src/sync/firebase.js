// The online database: Firebase Auth (email + password) and Cloud Firestore,
// behind the small interface engine.js expects. The only file that knows
// Firebase exists.
//
// Same Firebase project and account as Life Hub, but initialised under its
// own name, so this app's sign-in is kept apart from Life Hub's even where
// the two share a web address (both are published on fronk001.github.io).
//
// The SDK comes as ES modules from Google's CDN, fetched after the first
// paint. It is the one thing the app loads from anywhere else, and only for
// sync: without it the app opens and studies exactly as before. Firestore
// keeps its cache in memory; the durable copy of unsent changes is
// engine.js's queue in localStorage, which also works when the SDK itself
// can't be downloaded (an offline start).

const V = '12.19.0';
const sdk = name => import(`https://www.gstatic.com/firebasejs/${V}/firebase-${name}.js`);

const offlineError = () => Object.assign(new Error('offline'), { code: 'auth/network-request-failed' });

export function firebaseBackend(config) {
  let fb = null;
  let booting = null;
  let failed = false;

  function boot() {
    // A browser remembers a failed module download for the life of the
    // page and won't try again, so once online the only way to get the SDK
    // is a reload. engine.js asks for that only while nothing is under way.
    if (failed) {
      if (!navigator.onLine) return Promise.reject(offlineError());
      location.reload();
      return new Promise(() => {});
    }
    booting = booting || Promise.all([sdk('app'), sdk('auth'), sdk('firestore')]).then(([app, A, F]) => {
      const a = app.initializeApp(config, 'mongolian');
      // initializeAuth without the popup/redirect helpers: email + password
      // needs none of them, and they would load an extra iframe.
      const auth = A.initializeAuth(a, { persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence] });
      fb = { A, F, auth, db: F.getFirestore(a) };
      return fb;
    }, e => {
      failed = true;
      throw e;
    });
    return booting;
  }

  // engine.js marks removed fields with backend.DEL; write() swaps each
  // marker for Firestore's own deleteField().
  const DEL = Symbol('delete');
  const swap = v => {
    if (v === DEL) return fb.F.deleteField();
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]));
    return v;
  };

  const doc = (uid, id) => fb.F.doc(fb.db, 'users', uid, 'mongolian', id);

  return {
    DEL,

    async start(onUser) {
      const { A, auth } = await boot();
      A.onAuthStateChanged(auth, u => onUser(u ? { uid: u.uid, email: u.email || '' } : null));
    },

    async signIn(email, password) {
      const { A, auth } = await boot();
      await A.signInWithEmailAndPassword(auth, email, password);
    },

    async signOut() {
      const { A, auth } = await boot();
      await A.signOut(auth);
    },

    async resetPassword(email) {
      const { A, auth } = await boot();
      await A.sendPasswordResetEmail(auth, email);
    },

    listen(uid, onDocs, onError) {
      const { F, db } = fb;
      return F.onSnapshot(F.collection(db, 'users', uid, 'mongolian'), { includeMetadataChanges: true }, snap => {
        const docs = {};
        snap.forEach(d => { docs[d.id] = d.data(); });
        onDocs({ docs, fromCache: snap.metadata.fromCache });
      }, onError);
    },

    write(uid, writes) {
      const batch = fb.F.writeBatch(fb.db);
      for (const w of writes) batch.set(doc(uid, w.id), swap(w.data), { merge: w.merge });
      return batch.commit();
    },
  };
}
