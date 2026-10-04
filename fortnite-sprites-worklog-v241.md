# Fortnite Sprites Tracker — Work Log

**Project:** Fortnite Sprite Tracker
**GitHub assets repository:** https://github.com/robertduggan/fortnite-sprites-assets
**Current output:** `fortnite-sprites-tracker-v241.html` (internal version tag `v2.4.3`)

## v241 — Fixed a real data-loss bug: reads were going through a CDN that can lag behind writes

### The symptom

Reported: Rob toggles the Jonesy Sprite as owned, the app shows "Synced ✓". Switch to the Tro profile — Tro doesn't have it either (expected, separate data). Toggle it owned as Tro too, wait for sync. Switch back to the Rob tab — **Rob's Jonesy has reverted to not-owned**, with no console errors.

### Root cause

This was a different bug from the earlier 409 issue, caused by a different part of the code. `fetchProfileRemote()` — the function that reads a profile's saved data back — was reading from `raw.githubusercontent.com`. That endpoint is a **CDN edge cache** of file content, not a live reflection of the repository. GitHub documents that it can serve a cached copy for several minutes after a push. Neither the `cache: 'no-store'` fetch option (which only stops the *browser's* cache) nor the `?t=timestamp` cache-busting query parameter already in the URL reliably defeats this — the staleness lives on GitHub's CDN layer, a different layer entirely from anything a client request header can control.

The actual sequence that broke things:
1. Rob toggles Jonesy. The save genuinely succeeds and the real commit lands in the repo — the "Synced ✓" status was accurate the whole time.
2. Switching to Tro calls `switchProfile()`, which re-fetches **both** profiles' files (to keep the teammate view current) via `raw.githubusercontent.com`.
3. If Rob's just-written commit hadn't yet propagated to the CDN edge node serving that request, this fetch returned the **pre-write** content for `rob.json`.
4. The code trusted that response unconditionally and **overwrote the correct local cache** with the stale data.
5. Switching back to Rob re-fetched again — if still inside that propagation window, the same stale answer came back, making it look like the change had vanished. The real file in the repository was correct the entire time; this was purely a client-side read problem.

### Fix

Replaced the read path. `fetchProfileRemote()` now reads through the **Contents API** (`GET /repos/{owner}/{repo}/contents/{path}`, via `api.github.com`) instead of `raw.githubusercontent.com`. The Contents API is not a CDN cache of blobs — it reflects live repository state, which is exactly why it was already being used (safely) for the pre-save `sha` check. Specifics:

- Content comes back base64-encoded in the Contents API response; added a `b64decodeUtf8()` helper (the decode-side counterpart to the existing `b64utf8()` encoder) to unpack it.
- The same response also returns the file's current `sha` "for free" — `loadProfile()` now feeds that straight into the existing sha-cache (`rememberSha()`, added in the previous version for save efficiency), so a read-triggered-by-profile-switch can also save a redundant GET later if that browser goes on to write that profile's file.
- Reads optionally authenticate with whichever token is present in that browser (either profile's), which both avoids the stricter 60/hour unauthenticated rate limit and works correctly regardless of whose file is being read — Contents API permissions are repo-scoped, not path-scoped, so either person's token can read either file.
- If a read fails outright (network error, rate limit), the code now falls back to this browser's own last-known-good local cache rather than ever substituting a guess — "fail to the last confirmed truth," not "silently accept whatever came back."

`raw.githubusercontent.com` is no longer used anywhere in the data path.

### Validation

Re-ran the full regression suite (suppression check, interaction test, 409 retry/backoff, overlapping-save serialization, sequential-save sha-cache behavior) against this build — all still pass. One existing test (the cross-profile visibility check) needed its mock server updated to simulate the Contents API instead of the now-unused raw endpoint; once updated, it passed too, for the same underlying reason the bug is fixed.

Additionally wrote a new test that **reproduces the exact reported scenario end-to-end** against a single consistent mock server object (standing in for GitHub's real Contents API, which has no separate CDN layer to go stale): Rob toggles Jonesy and saves → switch to Tro (correctly sees Rob's Jonesy as owned/teammate) → Tro toggles Jonesy and saves → switch back to Rob → **Rob's Jonesy is still correctly shown as owned**, and now also correctly shows Tro's ownership as teammate-owned too. Zero runtime errors throughout.

### Why not just add more cache-busting to the raw.* URL instead

Considered, but there's no reliable client-side fix for CDN-edge staleness — any additional query-string trick is still fighting the same uncontrollable propagation delay on GitHub's side. Moving to an endpoint that was never a CDN cache in the first place removes the entire class of bug rather than reducing its odds.
