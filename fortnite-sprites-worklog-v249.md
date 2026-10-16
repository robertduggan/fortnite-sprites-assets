# Fortnite Sprites Tracker — Work Log

**Project:** Fortnite Sprite Tracker
**GitHub assets repository:** https://github.com/robertduggan/fortnite-sprites-assets
**Current output:** `fortnite-sprites-tracker-v249.html` (internal version tag `v2.5.1`)
**Also delivered:** `sprite-tracker-smoke-test.js` and `sprite-tracker-browser-test.py` (reusable tests, see the notes section; keep them with this worklog)

## v249 — Added the 5 Season 4 Quack sprites

### What was added

- 5 sprites (ids 357–361): **Quack Jonesy, Quack Adventure, Quack Bush, Quack Klombo, Quack Spooky Dash**. Each is a 7th card on its existing type (those five types now show "7 variants").
- A **Quack** entry in the Season 4 Variant filter bar and in By Category (🦆, after Trick or Treat, 5 sprites). The icon already existed from Season 3.
- Season 4 now has **162 sprites**; with Season 3's 117 that is 279, matching fortnite.gg's total.
- Rarity/drop are set to **special / 0%**. I could not read the Season 4 Quack pages on the site (see notes), so this is inferred from precedent: your Season 3 Quack sprites are special/0%, and every non-base variant I checked on the site (Honey, One Wish Willow) is special/0%. If the site shows something different, it is one field per sprite in `SPRITES_S4`.
- Sprite names match your uploaded filenames exactly (`Quack Bush Sprite.webp`, etc.), so no filename overrides were needed. Nobody's progress is affected; the first save after loading adds the 5 new keys to each person's file.

### A regression my change caused, found and fixed

Adding a 7th card made five by-type groups 1084px wide. At a 1024px-wide window the page's content area is only 976px, and by-type groups are forced onto a single line, so the page scrolled sideways: **before Quack, 0px of overflow at 1024; with Quack, 84px**. By-type groups wider than the screen now wrap their last card onto a second line. Groups that already fit are unchanged (the cap only applies to a group wider than the content area, so 1440px+ is unaffected by construction). Side effect: the by-type view at 768px, which already overflowed by 188px in v248 because of the 6-card groups, now has no overflow either. Verified with the browser test at 1920/1440/1024/768 in Classic and Dynamic layouts.

### Verification

- **Smoke test (new, 27 checks, real `rob.json`/`tro.json`)**, all passing: data integrity (unique ids, every sprite has its image, every variant is in the filter bar), plus for both seasons: card counts, by-type group sizes, group counters update on click for **every** type, by-category order and counts, every variant filter, searching every type name, a save round trip (payload has every key, keeps all existing progress, adds only the toggled sprite), default profile, zero runtime errors.
- **The test can fail:** I ran it against three deliberately broken copies (a typo'd filename, Quack missing from the filter bar, the old group-counter bug put back). All three were caught. That also showed the old counter bug affected **Dumpster Dive** as well as Storm Scout and Overshield (all three have 3-character icons); it is fixed in this build.
- **Real browser (Chromium):** all 162 images load after scrolling the whole page (none broken), no page errors, and no overflow at any width from 1920 down to 768.
- Reset-password gate re-checked (4 paths).

### Open items (not changed)

- **Mega Man's header is clipped in the by-type view** (a 1-card group is only 148px wide; "🤖 Mega Man" plus its count pill doesn't fit). Cosmetic. Fix idea: a minimum group width of about 212px, as By Category already uses.
- **Phone widths (390px):** the Show/Variant filter bar doesn't wrap, so the page scrolls sideways. The sprite groups themselves fit.
- Older save-retry tests (409 backoff, overlapping saves) were lost in an earlier sandbox reset and not re-run; save/sync code has not changed since v240.
- The `s3` folder holds UI icon files (`candy.webp`, `cube.webp`, `galaxy.webp`, `gem.webp`, `holofoil.webp`, `logo-hover.webp`, `quack.webp`) and `s4` holds `bg.webp`; none are sprites and none are used by the tracker. The smoke test lists them as INFO.

---

## Notes for future runs (written by Claude, for Claude)

*Why this section exists:* the v248 run (adding Honey and One Wish Willow) was expensive. This is what went wrong and the faster path. Read this before starting a sprite update.

### What made v248 expensive

1. **~16 throwaway test scripts with hard-coded numbers** (145 sprites, Rob 97, Tro 78, 121 cards…) that had to be re-edited every release, plus `sed` chains that left stale file paths so a test silently ran an old build. The scripts were then wiped by a sandbox reset. **Fix:** the two delivered test scripts read every expectation out of the HTML itself. Don't write new one-off harnesses; run these, and only extend them.
2. **Fetching `fortnite.gg/sprites` (the full list page) is enormous**, tens of thousands of tokens. It was only needed to learn names and ids. Don't fetch it again.
3. **Image check was wrong.** The page uses `loading="lazy"`; checking `naturalWidth` without scrolling flagged everything below the fold (and my earlier version of the check hid real problems). `browser.py` scrolls the whole page first.
4. **Layout polished by screenshot first.** Measure first (overflow, groups outside the margin, clipped headers), screenshot only to confirm. Each image costs tokens.
5. `/bin/sh` is `dash` here: no `<(...)` process substitution (use `bash -c` or temp files). A background `python -m http.server` dies between tool calls (browser.py starts and stops its own server in one process).

### Recipe: "I added images for new sprites, update the tracker"

1. `cd /home/claude/work` (may have been wiped; if so, copy the latest shipped HTML from `/mnt/user-data/outputs/` and `npm install jsdom --no-save`). Copy the latest HTML to the new `vNNN_tracker.html`.
2. Get the repo (no API rate limit): `curl -sL https://codeload.github.com/robertduggan/fortnite-sprites-assets/tar.gz/refs/heads/main -o repo.tar.gz`; list files with `tar -tzf repo.tar.gz | grep '\.webp$' | sed 's#^[^/]*/sprites/##'` (that produces the `s4/Name.webp` lines the smoke test wants), and diff against the previous list to see exactly what is new. Extract it to a folder for the browser test.
3. Live progress files for realistic tests: `curl -s https://raw.githubusercontent.com/robertduggan/fortnite-sprites-assets/main/progress/rob.json` (and `tro.json`). The GitHub REST API rate-limits unauthenticated calls (60/hour) quickly; codeload and raw.githubusercontent do not.
4. Edit the HTML with **one Python script** using `assert s.count(old)==1` before every replace. Places to touch: `SPRITES_S4` array (append; next free id is the max id + 1), the season's `TI` map (emoji for a new type), the season's `variants` list (only for a new variant), `CAT_ICONS` (only for a new variant), version in two places (`<span class="ver">` and `APP_VER`; the filename number is just the next integer and is independent of the internal tag).
5. Run `node sprite-tracker-smoke-test.js <html> repo_files.txt rob.json tro.json`, then `python3 sprite-tracker-browser-test.py <html> <repo_dir> rob.json tro.json [--shot "TypeName" --shotw 1024]`. Read only the FAIL / PROBLEM lines.
6. Deliver: the HTML plus a worklog `.md` (the user wants both for every version). Keep the closing message short.

### Data conventions (so I don't have to re-derive them)

- Sprite entry: `{id, name, type, variant, rarity, drop, starter}`. `name` + `.webp` must equal the file in `sprites/s3|s4/`, except ids in `ASSET_OVERRIDES` (Peeky Peely 118–122, ids 241 and 244).
- Variants per type in Season 4: Base, Gold, Cheat Master, Loot Hacker, Bounty Hunter, Trick or Treat (+ Quack on five types). Base rarity varies per sprite (rare/epic/legendary/mythic); every other variant is `special`, drop `0%`.
- **Naming quirk:** the files and fortnite.gg spell the Cheat Master tier "Cheatmaster" for newer sprites (name `Cheatmaster Honey Sprite`) but the *variant field* stays `Cheat Master` so filters and By Category group them correctly. Bush's tiers use "Bushranger" (`Loot Hacker Bushranger Sprite`) but Quack Bush is `Quack Bush Sprite`.
- Type order in the by-type view = first appearance in the array, with `pinnedLast` types (Crown, Klombo, Mega Man) moved to the end. Within a type, cards follow array order.
- A suppress list (`SUPPRESSED_VARIANTS`, currently empty) hides a variant everywhere without deleting data; use it if sprites are uploaded before release.
- Progress files hold `{s3:{id:{owned,level}}, s4:{...}}`; missing ids default to unowned, so adding sprites never disturbs existing progress.
- Plain link opens as Tro; Rob's bookmark has `?me=rob`. Reset password is "rambo" (client-side speed bump only). GitHub tokens must never be written into the page or any file (one was pasted into chat earlier; treat as revoked).

### Getting rarity / details for new sprites cheaply

- fortnite.gg per-sprite pages are small and give rarity and drop: `https://fortnite.gg/sprites/<id>-<slug>` (e.g. `267-honey-sprite`, `273-one-wish-willow-sprite`). **`web_fetch` only works on a URL that is in the current conversation context**, so it fails after earlier tool results are cleared; the first successful fetch of the list page is what made those URLs fetchable. A `web_search` costs ~7k tokens and rarely returns the site's own pages.
- Cheapest honest approach: if the new sprites are variants of existing types, use the precedent above and **say it is inferred**; for a brand-new base sprite, ask the user for the rarity (one short question) or flag the placeholder clearly, rather than spending tokens on searches.

### Tests: what they cover and how to read them

- `sprite-tracker-smoke-test.js` (jsdom, ~12s): everything listed under Verification. `-v` shows passes too. It has been mutation-tested; if I change app behaviour on purpose (e.g. new filter), update the test rather than weakening it.
- `sprite-tracker-browser-test.py` (Chromium, ~35s): per width (1920/1440/1024/768/390) × view (type Classic, type Dynamic, category All, category Missing): sideways overflow, groups outside the margin, clipped headers; plus the all-images check at 1440 after a full scroll. Category view at ≥768 and all images are strict (PROBLEM = fail); by-type rows and the 390px phone width are `(info)` because of the known limits above (Mega Man header, filter bar).
- Not covered by either: reset-password gate (stable; the check lived in a lost script), Export/Import, token/Settings UI, retry/backoff of saves.
