# Deploy to GitHub Pages

One-time setup:

1. Create a repo (e.g. `mongolian`) on GitHub — it can be private; Pages works
   on private repos for personal accounts on paid plans, otherwise make it public.
   There is nothing sensitive in here.

2. From this folder:

   ```
   git init
   git add .
   git commit -m "Mongolian study app, FSRS scheduling"
   git branch -M main
   git remote add origin https://github.com/<you>/mongolian.git
   git push -u origin main
   ```

3. Build and publish. `dist/` is gitignored, so publish it to a `gh-pages`
   branch. There is no Node here, so no `npx gh-pages` — plain git does it:

   ```
   py build.py
   py tools/publish.py
   ```

   `publish.py` commits `dist/` onto a `gh-pages` branch and pushes it, using
   only git. Run `py tools/publish.py --dry-run` first to see what it will do.

4. In the repo: **Settings → Pages → Source: deploy from branch `gh-pages`, root**.

   The app appears at `https://<you>.github.io/mongolian/`.

## Install on iPhone

Open the URL in **Safari** (not Chrome — only Safari can install PWAs on iOS),
then Share → Add to Home Screen.

This matters beyond convenience: iOS deletes script-created storage after 7 days
without interaction, but **home-screen installs are exempt**. The app also calls
`navigator.storage.persist()` on boot.

Even so, export a backup code occasionally. IndexedDB and localStorage on iOS
have a history of loss around OS updates, and the code is the only real safety net.

## Updating

```
py build.py && py tools/publish.py
```

The service worker is versioned by a content hash, so a changed build
invalidates the old cache automatically. Users get the new version on next launch.

## Notes

- `.nojekyll` is emitted into `dist/` so GitHub doesn't run Jekyll over it.
- Everything uses relative paths, so the app works from a subdirectory.
- Nothing is server-side. Any static host works; the repo is not GitHub-specific.
