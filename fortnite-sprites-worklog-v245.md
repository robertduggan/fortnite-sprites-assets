# Fortnite Sprites Tracker — Work Log

**Project:** Fortnite Sprite Tracker
**GitHub assets repository:** https://github.com/robertduggan/fortnite-sprites-assets
**Current output:** `fortnite-sprites-tracker-v245.html` (internal version tag `v2.4.7`)

## v245 — Password prompt added to Reset

### What changed

`resetAll()` now prompts for a password ("rambo", checked case-insensitively) before the existing "are you sure?" confirmation dialog. Cancelling the prompt, leaving it blank, or entering the wrong word stops the reset entirely (shows a toast: "Incorrect password — reset cancelled") and leaves all progress untouched; the existing confirm dialog still has to be accepted afterward even with the right password.

**Honest caveat, stated plainly:** since this is a static page with no backend, the password string lives directly in this file's own JavaScript. Anyone who opens the browser's dev tools or views page source can read it, or just call `resetAll()` (or the underlying reset logic) directly, bypassing the prompt entirely. This is a speed bump against an accidental or impulsive click on Reset, not a real access control — appropriate for guarding your own tracker's reset button between the two of you, not for protecting anything actually sensitive.

### Validation

Wrote a test exercising all four real paths through the gate, each checked by re-querying the actual sprite card's DOM state before and after (not a stale reference, since a successful reset rebuilds the grid via `render()`):
- **Wrong password** → reset does not happen, sprite stays owned.
- **Prompt cancelled** (no input) → reset does not happen.
- **Correct password, but the follow-up confirm declined** → reset does not happen.
- **Correct password in a different case ("RAMBO"), confirm accepted** → reset does happen, sprite correctly cleared.

All four passed with zero runtime errors.
