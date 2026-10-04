# Fortnite Sprites Tracker — Work Log

**Project:** Fortnite Sprite Tracker
**GitHub assets repository:** https://github.com/robertduggan/fortnite-sprites-assets
**Current output:** `fortnite-sprites-tracker-v240.html` (internal version tag `v2.4.2`)

## v240 — Fixed the real cause of the 409 errors; stayed on the Contents API

### The question this version answers

After the dual-profile GitHub sync feature shipped, saving sprite progress started failing with `409` ("sha mismatch") errors — reportedly even from two clicks in a row on one person's own file. That led to researching alternatives, including the GitHub Git Database API (blob → tree → commit → ref flow) as a way to "bypass" the file-level sha lock.

**Decision: stayed on the Contents API, did not switch to the Git Database API.** The Git Database API's final step (`PATCH .../git/refs/heads/{branch}`) is a fast-forward-only update by default — it's the same optimistic-concurrency check as the Contents API's `sha`, just relocated to the branch ref instead of the file, with 4–5 API calls per save instead of 1–2. The only way that flow is actually lock-free is adding `force: true` to the ref update, which removes conflict detection entirely: a losing write is silently and completely discarded with no error and no retry. For a progress tracker, "fails safely and retries" is a better property than "might silently lose a checkbox," so that trade wasn't worth taking — especially once the real cause turned out to be a fixable bug, not a limitation of the Contents API itself.

### Root cause of the 409s

`ghGetSha()` — the function that reads a file's current `sha` before saving — called `fetch()` **without `cache: 'no-store'`**. GitHub's Contents API GET responses are cacheable by the browser's normal HTTP cache. That means a save shortly after a previous one could have its "what's the current sha" request served silently from the browser's own cache instead of hitting the network, handing back a sha from *before* the prior save landed. The resulting PUT would then always conflict — fully explaining "409 even with two clicks in a row," independent of Rob and Tro writing to separate files (which was never actually the issue, since GitHub tracks `sha` per file, not per repo).

### Fixes applied

1. **Added `cache: 'no-store'` to `ghGetSha()`'s fetch call.** This alone directly closes the bug — every sha check now genuinely hits the network instead of risking a stale cached response.
2. **Added local sha caching, independent of the fix above, as a second layer of robustness.** Each profile's last-known file `sha` is now remembered (in memory and in `localStorage`, key `fnSprites_ghSha_<profile>`) from the response of its own last successful write. A normal save no longer performs a GET at all — it reuses the sha it already knows from its own prior write. A fresh GET is only triggered the very first time a profile saves in a session, or after an actual `409` (meaning the cached guess really was wrong, e.g. the same profile edited from a second device). This roughly halves the network calls for a typical save and removes any dependency on GET-response caching behavior for the common path.
3. Carried forward unchanged from v239/the serialization patch: one save in flight per profile at a time (overlapping edits queue a trailing re-save instead of racing), and up to 4 attempts with backoff (300ms/700ms/1.5s) before a save is marked failed.
4. **Trick or Treat sprites remain suppressed**, as set in the previous version — reconfirmed still filtered out in this build (see Validation).

### Validation

Re-ran the full regression suite against this build, plus one new targeted test for the actual bug:

- **Suppression check:** S4 renders exactly 121 cards (145 total minus the 24 suppressed Trick or Treat entries) — unchanged and confirmed again in this version.
- **New test — the exact reported failure mode:** simulated a server where a stale cached GET response would return an old `sha` if the client asked for it again. Save #1 (file creation) used 1 GET + 1 PUT. Save #2, fired sequentially right after, used **zero** additional GET calls — it reused the sha from save #1's own response — and succeeded on its first attempt. This directly proves the stale-cache trap can no longer be hit, because the fixed code doesn't re-request a sha it already has.
- **Interaction test:** toggle-owned, level up/down, clicking the read-only teammate checkbox (confirmed inert), switching seasons, switching profiles, and a debounced save as Tro with a token — all clean, one `PUT` fired as expected.
- **Cross-profile visibility test:** seeded Rob with two owned sprites, switched to Tro, confirmed both show as `teammate`/read-only (not `mine`) with the correct count in the teammate stat — the asymmetric Mine/Teammate behavior still works correctly end to end.
- **409 recovery test:** forced two consecutive conflicts from the (simulated) server before success — recovered on the 3rd attempt via the existing backoff loop.
- **Overlapping-save test:** forced a slow (800ms) save to still be in flight when a second edit landed — confirmed at most one write is ever truly in flight at a time (max concurrent = 1), both edits landed as separate successful commits, nothing raced.
- Full script re-passed `node --check` after all changes.

### Where things stand

- Rob and Tro should each still only need to connect their own token once per device (Settings → GitHub Sync) — nothing about that setup changed in this version.
- The 409 issue should now be resolved for the normal single-person-editing case. The one scenario that can still theoretically produce a conflict — the same profile open and actively edited from two devices/tabs at once — now resolves itself automatically via the retry/backoff instead of failing outright, rather than being eliminated at the protocol level (which, per the decision above, would have required giving up safe-failure guarantees).
