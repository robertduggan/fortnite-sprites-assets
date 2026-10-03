# Fortnite Sprites Tracker — Work Log

**Project:** Standalone HTML app mimicking fortnite.gg/sprites
**GitHub assets repo:** https://github.com/robertduggan/fortnite-sprites-assets
**Current output file:** fortnite-sprites-tracker-v236.html

---

## 1. Added missing sprites (base: fortnite-sprites-tracker-v2011.html)

Compared a sprite pack ("Rob's Sprites - Fortnite.GG" zip) against the existing tracker's Season 4 data and found the "Loot Hacker" season was missing most higher-tier variants and a few sprites entirely.

Added 28 new entries (IDs 247–274), embedding their artwork as base64 directly in the HTML at the time:

- **Loot Hacker variant** added for 14 types that were missing it: Jonesy, Bush (named "Loot Hacker Bushranger Sprite"), Adventure, 8-Bit, Sonic, Tails, Shadow, Killswitch, Jackrabbit, Klombo, Storm Scout, Overshield, Onigiri, X-Ray. (Crown already had its Loot Hacker sprite.)
- **Bounty Hunter variant** added for Crown and Jonesy (the only two types with art for that tier at the time).
- **Three new sprite lines added in full** (Base, Gold, Cheat Master, Loot Hacker): Blinky, Crash Bandicoot, Pond — plus new emoji icons in the type filter (TI map).
- Left Mega Man alone — only a Base image existed, no other variants to add.
- Validated the rebuilt data structure with Node (sprite/image ID matching, no duplicate IDs, clean JS syntax).

Output: `fortnite-sprites-tracker-v2012.html`

## 2. Compared tracker against live fortnite.gg/sprites

Checked the live fortnite.gg/sprites page against the local app's current-season data to confirm sprite entries were in sync. (Used as a validation pass before the GitHub migration work below — no file output from this step.)

## 3. GitHub hosting setup instructions

Since the HTML file was ballooning (5.5MB+) from embedding ~262 base64 webp images, provided step-by-step instructions for hosting the image files on GitHub instead of embedding them:

1. Create a new **public** GitHub repository (required — private repos won't serve images to browsers).
2. Plan a folder structure matching the app's season keys, e.g. `/sprites/s3/` and `/sprites/s4/`.
3. Get all `.webp` files organized locally into matching folders.
4. Upload via GitHub's web drag-and-drop (Chrome/Edge support whole-folder drag) or via `git clone` → copy files → `git add` / `commit` / `push`.
5. Verify files render in the GitHub repo UI.
6. Note the raw URL pattern: `https://raw.githubusercontent.com/<user>/<repo>/<branch>/<path>/<file>.webp`
7. Optional: mentioned jsDelivr as a faster CDN mirror option.

User created the repo and populated:
- `https://github.com/robertduggan/fortnite-sprites-assets/tree/main/sprites/s3` (124 files: 117 sprites + 7 shared UI icons: candy/cube/galaxy/gem/holofoil/quack/logo-hover.webp)
- `https://github.com/robertduggan/fortnite-sprites-assets/tree/main/sprites/s4` (146 files: 145 sprites + bg.webp)

## 4. Migrated HTML from embedded base64 → raw.githubusercontent.com URLs

Working from the user's uploaded `fortnite-sprites-tracker-v234.html` (S3: 117 sprites, S4: 145 sprites, 262 total):

- Downloaded the actual repo contents (via `codeload.github.com` tarball) to get exact real filenames rather than guessing.
- Matched each sprite's `name` field to a file of the same name + `.webp`, which worked for 255 of 262 entries automatically.
- Found and hand-mapped **5 naming exceptions**:
  - `Peely Sprite` / `Gold Peely Sprite` / `Gummy Peely Sprite` / `Galaxy Peely Sprite` / `Holofoil Peely Sprite` → actual files are named `Peeky Peely Sprite...webp` (S3)
  - `Cheat Master Onigiri Sprite` → file is `Cheatmaster Onigiri Sprite.webp` (S4, no space)
  - `Cheat Master X-Ray Sprite` → file is `Cheatmaster X-Ray Sprite.webp` (S4, no space)
- Rebuilt the `IMGS_S3` and `IMGS_S4` JS objects so each sprite ID maps to a URL instead of a base64 string:
  `https://raw.githubusercontent.com/robertduggan/fortnite-sprites-assets/main/sprites/{season}/{url-encoded filename}.webp`
- File size dropped from **5.5MB → ~109KB**.
- Validated: all 262 IDs have a non-empty image URL, full script passes `node --check`, and spot-checked ~10 URLs (including all 5 naming exceptions) returned HTTP 200.

Output: `fortnite-sprites-tracker-v235.html`

## 5. Migrated from raw.githubusercontent.com → jsDelivr CDN

Per user request, swapped the base URL for faster/cached global delivery:

- Old base: `https://raw.githubusercontent.com/robertduggan/fortnite-sprites-assets/main/sprites/`
- New base: `https://cdn.jsdelivr.net/gh/robertduggan/fortnite-sprites-assets@main/sprites/`
- Simple string substitution across all 262 URLs (same filenames/overrides as step 4, unchanged).
- Confirmed the URL pattern matches jsDelivr's documented GitHub-mirroring syntax via web search (couldn't hit cdn.jsdelivr.net directly from this session's sandboxed network to do a live fetch check — raw.githubusercontent.com URLs were already confirmed live in step 4, and jsDelivr mirrors the same public repo).
- Re-validated script syntax (`node --check`) after the swap.

Output: `fortnite-sprites-tracker-v236.html` *(current/latest version)*

**Known caveat flagged to user:** jsDelivr's cache can lag up to ~24h behind new commits to the repo — fine for static assets, worth knowing if images are swapped out later. First load of a never-before-requested file may also take a moment longer while jsDelivr fetches it from GitHub to populate its edge cache.

---

## Current state

- Live file: `fortnite-sprites-tracker-v236.html`, loading all 262 sprite images from jsDelivr, pointed at `robertduggan/fortnite-sprites-assets` on GitHub, `main` branch.
- Season data (SPRITES_S3 / SPRITES_S4) and image maps (IMGS_S3 / IMGS_S4) are the source of truth inside the HTML; images themselves now live only in the GitHub repo, not embedded in the file.
- Folder convention in the repo: `/sprites/s3/<Sprite Name>.webp`, `/sprites/s4/<Sprite Name>.webp`, matching each sprite's `name` field exactly **except** the 5 Peely/Cheatmaster exceptions noted in step 4 — keep that in mind if more sprites are added later with similar naming quirks.
