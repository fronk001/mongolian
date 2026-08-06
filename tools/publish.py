"""
Publish dist/ to the gh-pages branch. Replaces `npx gh-pages` — no Node here.

    py build.py
    py tools/publish.py --dry-run     # show what would happen
    py tools/publish.py               # commit dist/ to gh-pages and push

Uses git plumbing with a scratch index, so your working tree, your current
branch and your staged changes are never touched. dist/ stays gitignored on
main; only the gh-pages branch carries it.
"""
import os
import subprocess
import sys
from pathlib import Path

BRANCH = "gh-pages"
DIST = Path("dist")
# Absolute: with --work-tree, git resolves a relative GIT_INDEX_FILE against
# the work tree rather than the cwd, and would look for dist/.git/.
INDEX = (Path(".git") / "publish-index").resolve()


def git(*args, check=True, **kw):
    r = subprocess.run(["git", *args], text=True, capture_output=True, **kw)
    if check and r.returncode != 0:
        sys.stderr.write(f"git {' '.join(args)}\n{r.stderr.strip()}\n")
        raise SystemExit(1)
    return r


def ref_exists(ref: str) -> bool:
    return git("rev-parse", "--verify", "--quiet", ref, check=False).returncode == 0


def main() -> int:
    dry = "--dry-run" in sys.argv

    if git("rev-parse", "--is-inside-work-tree", check=False).returncode != 0:
        print("not a git repository — see DEPLOY.md step 2", file=sys.stderr)
        return 1
    if not DIST.is_dir() or not any(DIST.iterdir()):
        print("dist/ is missing or empty — run `py build.py` first", file=sys.stderr)
        return 1
    if not (DIST / "index.html").exists():
        print("dist/index.html is missing — is dist/ really the build?", file=sys.stderr)
        return 1

    remotes = git("remote").stdout.split()
    if not remotes:
        print("no git remote configured — see DEPLOY.md step 2", file=sys.stderr)
        return 1
    remote = "origin" if "origin" in remotes else remotes[0]

    # Build a tree from dist/ using a scratch index. --force because dist/ is
    # gitignored on main and we want it here regardless.
    env = {**os.environ, "GIT_INDEX_FILE": str(INDEX)}
    INDEX.unlink(missing_ok=True)
    try:
        git("--work-tree", str(DIST.resolve()), "add", "--all", "--force", ".",
            env=env, cwd=DIST)
        tree = git("write-tree", env=env).stdout.strip()
    finally:
        INDEX.unlink(missing_ok=True)

    force = "--force" in sys.argv
    parent = None
    if ref_exists(f"refs/heads/{BRANCH}"):
        parent = git("rev-parse", f"refs/heads/{BRANCH}").stdout.strip()
        if git("rev-parse", f"{parent}^{{tree}}").stdout.strip() == tree and not force:
            print(f"{BRANCH} already matches dist/ — nothing to publish")
            print("(use --force to re-trigger a Pages deployment anyway)")
            return 0

    src = git("rev-parse", "--short", "HEAD", check=False).stdout.strip() or "unknown"
    files = sum(1 for p in DIST.rglob("*") if p.is_file())
    msg = f"Publish dist ({files} files) from {src}"
    if force and parent and git("rev-parse", f"{parent}^{{tree}}").stdout.strip() == tree:
        # Same content, new commit: the only way to re-trigger a Pages build
        # without the web UI. The first deploy after enabling Pages often
        # fails because the branch push predates the site being provisioned.
        msg = f"Redeploy dist ({files} files) from {src}"

    if dry:
        print(f"would commit tree {tree[:10]} to {BRANCH}"
              f"{f' on top of {parent[:10]}' if parent else ' (first commit)'}")
        print(f"would push {BRANCH} -> {remote}")
        print(f"message: {msg}")
        return 0

    args = ["commit-tree", tree, "-m", msg] + (["-p", parent] if parent else [])
    commit = git(*args).stdout.strip()
    git("update-ref", f"refs/heads/{BRANCH}", commit)
    print(f"{BRANCH} -> {commit[:10]}  ({msg})")

    push = git("push", remote, BRANCH, check=False)
    if push.returncode != 0:
        print(push.stderr.strip(), file=sys.stderr)
        print(f"\nlocal {BRANCH} is updated; push failed. Retry with:\n"
              f"    git push {remote} {BRANCH}", file=sys.stderr)
        return 1
    print(f"pushed to {remote}/{BRANCH}")
    print("GitHub Pages: Settings -> Pages -> deploy from branch gh-pages, root")
    return 0


if __name__ == "__main__":
    sys.exit(main())
