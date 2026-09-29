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

3. In the repo: **Settings → Pages → Source: GitHub Actions**. This applies
   immediately; there is no Save button to press.

4. Push to `main`. `.github/workflows/pages.yml` runs `build.py` and publishes
   `dist/`, so nothing needs to be built or committed by hand:

   ```
   git push
   ```

   The app appears at `https://<you>.github.io/mongolian/`.

### Why Actions rather than a gh-pages branch

The branch path failed here with `Timeout reached, aborting!` in the deploy
job. `actions/deploy-pages` polls for a Pages site that selecting a branch had
never actually provisioned — the repo reported `has_pages: true` while
`GET /repos/<you>/<repo>/pages` returned 404. `actions/configure-pages` in the
workflow creates the site explicitly, which is the missing step.

`tools/publish.py` still works and still pushes `dist/` to a `gh-pages`
branch, if you ever want to publish without CI:

```
py build.py && py tools/publish.py          # --dry-run to preview
py build.py && py tools/publish.py --force  # redeploy unchanged content
```

## Install on iPhone

Open the URL in **Safari** (not Chrome — only Safari can install PWAs on iOS),
then Share → Add to Home Screen.

This matters beyond convenience: iOS deletes script-created storage after 7 days
without interaction, but **home-screen installs are exempt**. The app also calls
`navigator.storage.persist()` on boot.

Even so, turn on sync (`SYNC.md`), or without it export a backup code
occasionally. IndexedDB and localStorage on iOS have a history of loss around
OS updates; the online copy (or the code) is the real safety net.

## Updating

```
git push
```

CI rebuilds and republishes on every push to `main`. It also fails the build
if `dist/` ever gains an external URL, which would break the offline-first
rule — with one allowed address, sync's Firebase SDK in `dist/sync/firebase.js`.

The service worker is versioned by a content hash, so a changed build
invalidates the old cache automatically. Users get the new version on next launch.

## Notes

- `.nojekyll` is emitted into `dist/` so GitHub doesn't run Jekyll over it.
- Everything uses relative paths, so the app works from a subdirectory.
- Nothing is server-side except sync's Firebase project, which is reached
  directly from the browser. Any static host works; the repo is not
  GitHub-specific (a new host's domain needs adding to Firebase's authorized
  domains, like `fronk001.github.io` was).
