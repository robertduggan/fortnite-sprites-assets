# Fortnite Sprites Tracker — Work Log

**Project:** Fortnite Sprite Tracker
**GitHub assets repository:** https://github.com/robertduggan/fortnite-sprites-assets
**Current output:** `fortnite-sprites-tracker-v244.html` (internal version tag `v2.4.6`)

## v244 — Default profile is now Tro; Rob gets his own bookmark link

### The ask

Load the page and default to Rob automatically for Rob specifically, but default to Tro for anyone else opening the same link — without any kind of login, since this is a static page with no backend to authenticate who's visiting.

### How it works

There's no way for a static page to genuinely know who's opening it, so this uses the practical equivalent: a URL marker that only Rob's own bookmark includes.

- **The default (plain link, no marker) now resolves to Tro** — previously the hardcoded fallback was always Rob regardless of device, which was backwards from what was wanted.
- **A `?me=rob` query parameter overrides the default to Rob**, and gets remembered in that browser's `localStorage` from then on — so the parameter only has to be in the bookmark itself; it doesn't need to be retyped or kept in the address bar afterward.
- An invalid or unrecognized value for `?me=` (anything that isn't `rob` or `tro`) is silently ignored, falling back to the Tro default rather than erroring.

**Rob's bookmark should be:**
`https://robertduggan.github.io/fortnite-sprites-assets/fortnite-sprites-tracker-v244.html?me=rob`

The plain link (the filename with no `?me=...` at all) is what anyone else — or a freshly cleared browser — lands on, and it opens as Tro.

### Validation

Wrote a dedicated test covering three cases on the actual shipped file:
- Plain URL, no parameter → correctly defaults to Tro, nothing written to local storage (nothing to remember yet).
- URL with `?me=rob` → correctly defaults to Rob, and `rob` is correctly persisted to local storage for next time.
- URL with an invalid value (`?me=bogus`) → correctly ignored, falls back to Tro, nothing persisted.

All three passed with zero runtime errors. Also re-ran the full existing regression suite. Four older tests needed their test *fixtures* updated to explicitly include `?me=rob` in their simulated URL — they'd been written assuming the old "always defaults to Rob" behavior, which this version intentionally changes, so that update was expected rather than a sign of a real problem. Once updated, all of them — the 409 retry/backoff test, the overlapping-save serialization test, the sequential-save sha-cache test, and the full Jonesy cross-profile repro — passed cleanly again, confirming the underlying save/sync logic wasn't affected by this change, only the starting default was.
