# Syncing your progress between devices

With sync on, the Mongolian app keeps one copy of your progress online, in
the same free Firebase database as Life Hub, under the same account. Study on
the laptop or on the iPhone: the other one has it the next time you open it,
or within a second or two if it's already open. No more backup codes.

It takes three short steps, once. Claude never sees your password, and
doesn't need to.

---

## 1. Publish the new database rules

The database only lets your account in where its rules say so, and until now
they only mentioned Life Hub. This adds the Mongolian app.

1. Go to **https://console.firebase.google.com**, signed in with your usual
   Google account, and open the **life-hub** project.
2. Left menu: **Databases & Storage** → **Firestore** (older layouts:
   **Build** → **Firestore Database**), then the **Rules** tab.
3. Delete everything in the editor. Open the file `firestore.rules` from the
   **Life Hub** folder (right-click → Open with → Notepad), copy **all** of
   it, and paste it in. It now covers both apps.
4. **Publish**.

Life Hub keeps working exactly as before: its part of the rules hasn't
changed.

## 2. Sign in on the laptop

1. Open the Mongolian app the way you normally do.
2. Go to **Settings**. At the top is **Sync**, saying **OFF**. Tap **Sign in**.
3. Use the same email and password as Life Hub.
4. Sync now says **ON**, and your progress is online.

## 3. Sign in on the iPhone

1. Open the Mongolian app **from its home-screen icon** (the installed app
   keeps its own storage, separate from Safari).
2. **Settings** → **Sign in**. Type your email; for the password, tap the
   suggestion above the keyboard.
3. That's it. The progress on the phone and the progress online are combined:
   for every word it keeps the most recent review, and every day you studied
   on either device counts. So it doesn't matter which device you sign in on
   first, and you don't need to move a code across one last time.

If Life Hub's **Open app** button opens the Mongolian app in Safari instead
of your installed app, sign in there once as well, and it shows the same
progress too.

---

## Afterwards

- **No signal?** Study as normal. Your lessons wait on the device and go up by
  themselves once you're connected, even if you close the app in between.
- **Studied on both while one was offline?** Both lessons count: your XP from
  each is added up, and a word you reviewed on both keeps its latest review.
- **Backup codes** still work, but you don't need them any more: the online
  copy is the backup, so the app stops reminding you. Importing a code while
  signed in replaces your progress everywhere, online included.
- **Sign out** (Settings → Sync) only stops syncing on that device. Your
  progress stays on it, and online. Signing in again picks it up and adds
  anything you did in between.

## The dot on Today

The small dot next to the date, top right of Today, shows sync at a glance.
Tap it to open Settings, which says the same in words.

- **Blue**: this device is in step (ON).
- **Blue ring**: on its way: connecting for a moment when the app opens,
  offline, or a change still going up. Nothing to do.
- **Red**: needs you. This device isn't signed in (OFF), the sign-in ended
  (SIGNED OUT), or the database refused something (NOT SYNCING).

## What Sync in Settings can say

- **OFF**: this device isn't syncing. Tap **Sign in**.
- **ON**: all good. Everything you do goes up by itself.
- **OFFLINE**: no connection right now. Changes are saved on the device and go
  up once you're back online.
- **SYNCING**: changes are taking a while to reach the database.
- **SIGNED OUT** (red): the sign-in ended, say after a password change. Your
  progress is kept on the device; sign in again and it goes up.
- **NOT SYNCING** (red): the database refused something. The reason is shown
  underneath. "permission-denied" means the rules from step 1 aren't
  published yet: do step 1, then tap **Try again**.

## If something goes wrong

- **"That email and password don't match."** Check for typos. Forgotten
  password: type your email and tap **Forgot password?**, and a reset link
  arrives by email. It's the same password as Life Hub's, so a new one
  applies to both apps.
- **Sign-in never finishes.** Check the internet connection, then close and
  reopen the app. Still stuck: tell Claude what you see.
