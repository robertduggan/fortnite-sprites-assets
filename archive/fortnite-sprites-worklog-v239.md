# Fortnite Sprites Tracker — Work Log

**Project:** Fortnite Sprite Tracker
**GitHub assets repository:** https://github.com/robertduggan/fortnite-sprites-assets
**Current output:** `fortnite-sprites-tracker-v239.html`

## v2.4.0 — Dual-profile GitHub sync + Trick or Treat suppression

### What changed

**1. Suppressed the Trick or Treat sprites.** They were released too early. Added a `SUPPRESSED_VARIANTS` set (`new Set(['Trick or Treat'])`) that filters them out of each season's active roster and variant-filter dropdown at load time. The underlying sprite data (24 entries across S4) is untouched — to bring them back later, just clear that set. Verified: S4 card count went from 145 to 121 (145 − 24 = 121 ✓).

**2. Replaced browser-only `localStorage` with a two-profile, GitHub-backed data model.** Previously all progress lived only in whichever browser had it (localStorage), with a manual "teammate" checkbox you'd update yourself, synced only via manual JSON export/import. Now:
- Each person — **Rob** and **Tro** — has their own canonical data file in the repo: `progress/rob.json` and `progress/tro.json`. Shape: `{s3:{<id>:{owned,level}}, s4:{<id>:{owned,level}}}`.
- **Reads** happen via `raw.githubusercontent.com` (public, unauthenticated, no rate-limit concerns) — both files are fetched on every page load, so whoever opens the page always sees the current state of both collections, not a stale local copy.
- **Writes** happen via GitHub's Contents API (`GET` for the current file `sha`, then `PUT` with the updated content) using a personal access token the person pastes once into Settings → GitHub Sync. The token is stored only in `localStorage` on that one browser/device — never embedded in the page, never committed to the repo.
- Saves are **debounced** ~2.5 seconds after the last change, so a run of checkbox clicks becomes one commit, not one per click.
- If no token is connected yet (or the network/API call fails), changes still save instantly to that browser's local cache so nothing is lost — they just won't reach GitHub until a token is added or the next successful save retries.

**3. "Mine" vs "Teammate" is now live and automatic, and strictly asymmetric by design:**
- Whichever profile is active in your browser is **"Mine"** — fully editable (owned checkbox, level stepper).
- The other profile is always **"Teammate"** — rendered **read-only**. Clicking that checkbox shows a toast ("Rob's own tracker — switch profiles to edit it") instead of changing anything. There is no code path left that lets one profile write to the other's data.
- This replaces the old manual system entirely: the "Teammate's Sprites" export, "Share Mine as Teammate" export, and teammate-import options were removed from the Export/Import modal, since they're no longer needed — the view is always current automatically. "My Sprites" and "Everything" exports remain, as personal backups of your own data only.

**4. Profile switcher + per-profile theme.** Two pill buttons in the header ("Rob" / "Tro") switch which profile is active in that browser, persisted via `localStorage` so each device remembers its own setting after the first switch. Rob's theme is emerald green (as requested); Tro's is sapphire blue (my pick for a clearly distinct second color — easy to change, it's two CSS variables: `body[data-profile="tro"] { --profile: ...; --profile-dim: ...; }`).

### Validation

Given the v237 lesson — `node --check` only catches syntax errors, not a crash from an undeclared variable — validation this time actually **executed** the page rather than just parsing it:

- Installed jsdom and ran the full script in a simulated browser DOM three separate times, stubbing `fetch` to simulate GitHub's API (404s for a fresh repo, then a populated fixture) and `localStorage` in-memory.
- **Run 1 (cold boot, no data):** zero runtime errors; S4 rendered 121 cards (confirming suppression); sync status correctly showed "Not connected"; theme correctly defaulted to Rob/emerald.
- **Run 2 (interaction stress test):** clicked a sprite card (owned toggled true), clicked level-up (level went to 1), clicked the read-only teammate checkbox (confirmed no class change — correctly inert), switched seasons S4→S3→S4 (117 cards on S3, matching its known roster size), switched profile to Tro (theme/label/pill state all updated correctly), connected a fake token as Tro, toggled a sprite, and confirmed exactly one debounced `PUT` call fired after ~2.5s. Zero runtime errors across the whole run.
- **Run 3 (real cross-profile data check):** seeded a fixture where "Rob" owns two specific S4 sprites (with levels), booted as Rob, then switched to Tro and confirmed: those two sprites show `tm-owned` (read-only, correctly marked as the teammate's) and *not* `own`; the teammate stat count (`sTm`) correctly read 2. This directly confirms the asymmetric visibility you asked for actually works end to end, not just that the labels swap.

### Known limitations / things to set up

- **GitHub Pages must still be the way this is opened** (same as v238) — opening the raw file locally or via the GitHub "blob" viewer won't work, since the GitHub API/raw-content fetches and relative sprite paths all assume it's served from `https://robertduggan.github.io/fortnite-sprites-assets/...`.
- **`progress/rob.json` and `progress/tro.json` don't exist in the repo yet.** The first successful save from each profile will create them automatically via the GitHub API (a `PUT` with no prior `sha` creates the file). Nothing needs to be pre-created manually.
- **Security tradeoff, stated plainly:** a write-capable GitHub token has to live somewhere for this to work without a server, and that "somewhere" is each person's own browser `localStorage`. The mitigation is to use a **fine-grained** personal access token scoped to only this one repository with only `Contents: Read and write` permission, and a real expiration date — never a classic token with broader account access. If a token did leak, the blast radius is "someone can edit files in this one hobby repo," not "someone has access to your GitHub account." Settings → GitHub Sync has this guidance inline with a direct link to create the right kind of token.
- **Each browser needs its own token, once.** If Rob opens the tracker on both his phone and his laptop, he needs to paste his token into Settings on each device the first time (or just use it read-only there without ever connecting a token, if he doesn't need to edit from that device).

### Setup still needed from Rob and Tro

1. Each of you creates your own fine-grained PAT at `github.com/settings/personal-access-tokens/new`, scoped only to `fortnite-sprites-assets`, with `Contents: Read and write`, and a real expiration date.
2. Open the live page, click your own name in the profile switcher (Rob stays on Rob; Tro clicks "Tro" once — it's remembered after that).
3. Open Settings → GitHub Sync → paste your token → Connect.
4. Make a test change (toggle one sprite) and confirm the sync status bar shows "Saving to GitHub…" then "Synced ✓", and that a new commit shows up in the repo's commit history a few seconds later.
