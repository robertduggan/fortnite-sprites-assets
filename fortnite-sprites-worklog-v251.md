# Fortnite Sprite Tracker — worklog (v250, token-optimized)

**Current build:** `fortnite-sprites-tracker-v251.html` (internal tag `v2.6.1`) · Repo: `robertduggan/fortnite-sprites-assets` (branch `main`, GitHub Pages) · Single HTML file; sprites in `sprites/s3|s4|s5/`; progress in `progress/rob.json` + `tro.json`.
**State:** S3 117 sprites, S4 162, **S5 34** (Treasure Hunters). Seasons are driven by one `SEASONS` object, so new sprites for an existing season = data only.

---

## ▶ UPDATE — all you need (read only down to the `## REFERENCE` line; do NOT read the rest unless the script reports a problem)

**Do NOT** read/cat the HTML, tests or kit; fetch fortnite.gg; search the web; write tests; take screenshots. New sprite images are already on GitHub `main` in `sprites/s5/`.

**Call 1 — one command** (unzip, download repo, add sprites, run smoke + browser tests, write the new HTML **and** the new worklog to outputs):
```bash
cd /home/claude && mkdir -p kit && unzip -oq /mnt/user-data/uploads/*.zip -d kit && bash kit/update-tracker.sh kit/fortnite-sprites-tracker-vOLD.html
```
`vOLD` = the HTML's real filename. Output names (vOLD+1) and the version tag (patch+1) are automatic. Optional extra args: `--bump 2.7.0` (bigger change), `--season s6` (new season, see REFERENCE), `--rarity "Kelper=epic"`, `--icon "Type=🌊"`. ~1 min.

**Read its output:** `+id …` = what was added. `NEEDS RARITY (placeholder): X` → ask the user for X's rarity in the final reply (don't search); once answered, re-run Call 1 with `--rarity "X=epic"` (always from the ORIGINAL html). `NEEDS ICON for new type/variant` → re-run with `--icon "X=🌊"` (pick an emoji yourself). `STOP: no new sprites` → images not committed to `main`; tell the user, nothing is written. Success = `ALL PASS`, `RESULT: clean`, no FAIL/PROBLEM lines (clipped by-type headers for 1-card groups are known/ignorable).

**Call 2 — `present_files`** with the two paths printed on the last line (new HTML + new worklog; always both). If a kit file was ever edited, also `cp` it to `/mnt/user-data/outputs/` and present it.
**Final reply (short):** counts added per type/variant, what needs their input (rarities, icons, uncommitted images), test result in one line.
The worklog is already updated by the script (build line, State count, Release log entry). Edit it by hand only to resolve S5 placeholders (rarities/variants) in *S5 specifics*.

---

## REFERENCE (only if the pipeline can't do something)

## How the page is built

- Data: `const SPRITES_S5 = [ {id, name, type, variant, rarity, drop, starter}, … ]`. `name + ".webp"` must equal the file in `sprites/s5/` (S5 has **no " Sprite" suffix**; S3/S4 names end in " Sprite"). Overrides for odd file names live in `ASSET_OVERRIDES` (ids 118–122, 241, 244).
- Season config in `SEASONS.sN`: `label`, `SPRITES`, `TI` (type → emoji), `pinnedLast` (types shown last), `variants` (filter bar order; **only list variants that have sprites**, the smoke test fails on an empty one), `KEY`.
- Rarity values: `rare epic legendary mythic special` (colours in `RC`, sort in `RO`). Base sprites vary; every other variant is `special`, drop `0%`. `starter:true` shows a "Start" badge (S5: none).
- Type order in by-type view = first appearance in the array, `pinnedLast` moved to the end. By Category order = the season's `variants` order. `CAT_ICONS` = category header emoji.
- IDs only need to be unique; `add_sprites.py` uses global max + 1. Progress files are keyed per season `{s3:{id:{owned,level}},…}`; unknown ids default to unowned, so adding sprites never disturbs progress.
- Plain link opens as Tro; Rob's bookmark has `?me=rob`. Reset password is "rambo" (client-side speed bump). Never put GitHub tokens in the page or any file.

### New season (e.g. S6) — the pipeline can't do this part automatically
Do once by hand with ONE Python script (`assert s.count(old)==1` before each replace): add `SPRITES_S6 = [ ... ]` (can start with 1 placeholder entry per sprite, then let `add_sprites.py --season s6` do the rest if the array has at least one entry), an `s6` entry in `SEASONS`, tab button `tabS6` (and make previous tab non-active), `curSeason='s6'`, the 3 tab lines in `boot()`, the full-backup export object (`s5:profileData[...].s5` pattern) and the import check (`d.sprites.s3||d.sprites.s4||…`). Then in `sprite-tracker-smoke-test.js`: change `['3','4','5']` → add `'6'` and `LAST = 's6'`. Use 
`grep -n "s5\|S5" file.html` on the HTML to find every spot to mirror. `add_sprites.py --season s6` requires `SPRITES_S6` to already exist with ≥1 entry.

## Gotchas (all hit before)
- **Images must be committed to `main`**: if the report says "nothing new" or the folder only has `index.html`, the user uploaded but hasn't committed (happened for S5). Tell them; don't guess names.
- The repo is read through `codeload.github.com` + `raw.githubusercontent.com` (no rate limit). The GitHub REST API rate-limits at 60/hour; don't use it.
- Page images are `loading="lazy"`; the browser test scrolls the whole page first (don't "fix" that).
- `/bin/sh` is dash: no `<(...)`; run scripts with `bash`. A background `http.server` dies between tool calls (the browser test starts/stops its own).
- Rarity/drop of non-base variants is inferred from precedent (special/0%). For a brand-new base sprite it is a placeholder until the user gives the rarity. Per-sprite pages exist at `fortnite.gg/sprites/<id>-<slug>` but `web_fetch` only works on URLs already in the conversation, so don't bother.
- Naming quirks (S4): files say "Cheatmaster" but the variant field stays `Cheat Master`; Bush tiers use "Bushranger". `add_sprites.py` maps the `Cheatmaster` prefix to `Cheat Master`.

## Open items
- **By-type header clipped for 1-card groups** (Mega Man in S4; Sweet Dreams, Transponder Snail in S5): cosmetic; the browser test lists them as `(info)`. Fix idea: min group width ≈212px in the by-type view (By Category already has this floor).
- Phone width (390px): the Show/Variant filter bar scrolls sideways. Not covered by tests: reset password, export/import UI, settings/token UI, save retry/backoff.

## S5 specifics (Treasure Hunters mini season, tab "CH7 S5")
- 11 base types: Halfpeel'd, Re-Pete, Barry O'Fish, Exmarks, Plundarrgh, Chester, Wayfinder, Kelper, Lil' Squibbly, Lil' Flacko, Sweet Dreams; plus Transponder Snail (single card; not in the published 33-sprite list, unconfirmed).
- Variants announced for every base type: **Fortune** (uploaded for 10 of 11 + Uzi; Fortune Sweet Dreams pending), **Cursed** (uploaded for 10 + Uzi; Cursed Kelper and Cursed Sweet Dreams pending), and **Gold** (scheduled Nov 12). When their images land, the pipeline adds them and the filter-bar entries automatically.
- **Rarities of the 13 base sprites (incl. Lil' Uzi Vert Jr) are still PLACEHOLDERS (`rare`).** Ask the user for real values; apply with `--rarity "Kelper=epic" --rarity "Sweet Dreams=legendary" …` (type or file name before `=`) on a re-run from the original HTML, or edit `SPRITES_S5` directly.
- Tab label `CH7 S5` is a guess (could be "Treasure Hunters").

## Release log (newest first) — ✏ add an entry each release
- **v251** — S5: +12 sprites (ids 384–395): new base type Lil' Uzi Vert Jr (+ Fortune), and the **Cursed** variant for 10 types (not Kelper, Sweet Dreams). New Cursed filter/category (👻); Uzi type icon 💜. Done by hand: kit scripts were NOT in the zip, so only syntax check + file-exists check ran (no smoke/browser test). Uzi base rarity is a placeholder (`rare`).
- **v250 kit refresh (no tracker change)** — Update is now ONE command: `update-tracker.sh` derives the new file names + version tag and also writes the new worklog (via new `worklog_update.py`: build line, State count, Release log entry). Worklog split into a short UPDATE section + REFERENCE (read only on problems). Tested with simulated new sprites: smoke 38/38, browser clean.
- **v250** — Added Season 5: new CH7 S5 tab, 22 sprites (ids 362–383): 11 base types + Transponder Snail + Fortune variants for 10 types. Rarities placeholder. Full-backup export/import include s5. Page opens on S5. Tests extended to s3/s4/s5 (smoke 38 checks, all pass; browser: all 301 images load, no overflow, no errors). New kit added: `add_sprites.py` (auto-adds new sprites) and `update-tracker.sh` (one-shot pipeline).
- v249 — S4 Quack sprites (5; ids 357–361), Quack filter/category; fixed by-type groups wider than the screen (wrap last card); fixed group counter bug for types with 3-char icons.
- v248 and earlier — Honey and One Wish Willow (S4), Trick or Treat, By Category view, teammate view, GitHub profile sync (Rob/Tro), smoke test introduced.

## Kit files (keep together with the HTML + this worklog in the zip; now includes `worklog_update.py`)
`update-tracker.sh` (pipeline: download repo → add sprites → smoke → browser → writes new HTML + worklog) · `worklog_update.py` (auto-updates build line, State count, Release log) · `add_sprites.py` (diffs `sprites/sN/*.webp` against the array; splits `<Variant> <Type>` names; rarity/icons/filter bar/version) · `sprite-tracker-smoke-test.js` (jsdom, reads expectations from the HTML; mutation-tested) · `sprite-tracker-browser-test.py` (Chromium: overflow, clipped headers, every image in every season).
