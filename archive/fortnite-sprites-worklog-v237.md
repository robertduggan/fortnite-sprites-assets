# Fortnite Sprites Tracker — Work Log

**Project:** Fortnite Sprite Tracker  
**GitHub assets repository:** https://github.com/robertduggan/fortnite-sprites-assets  
**Current output:** `fortnite-sprites-tracker-v237.html`

## v2.3.7 — GitHub-hosted application / optimized asset references

### Starting point
Built directly from the supplied `fortnite-sprites-tracker-v236.html` and its accompanying worklog.

### Changes

1. **GitHub is now treated as the application/asset home**
   - The tracker is designed to be served from the repository through GitHub Pages.
   - Sprite assets are referenced relative to the application:
     - `./sprites/s3/...`
     - `./sprites/s4/...`
   - This avoids hard-coding `raw.githubusercontent.com` or jsDelivr into the application.

2. **Removed all embedded image data**
   - No Base64 image payloads remain.
   - No jsDelivr image URLs remain.
   - The HTML remains approximately 74 KB instead of approximately 105 KB in v2.3.6.

3. **Reduced the image mapping substantially**
   - v2.3.6 contained 262 complete CDN URLs.
   - v2.3.7 derives the normal filename from the sprite's existing `name`:
     - `<sprite name>.webp`
   - `encodeURIComponent()` is used when constructing the URL so spaces and special characters are safely represented.

4. **Preserved the seven known filename exceptions**
   - S3:
     - ID 118 — `Peeky Peely Sprite.webp`
     - ID 119 — `Gold Peeky Peely Sprite.webp`
     - ID 120 — `Gummy Peeky Peely Sprite.webp`
     - ID 121 — `Galaxy Peeky Peely Sprite.webp`
     - ID 122 — `Holofoil Peeky Peely Sprite.webp`
   - S4:
     - ID 241 — `Cheatmaster Onigiri Sprite.webp`
     - ID 244 — `Cheatmaster X-Ray Sprite.webp`

5. **Corrected version metadata**
   - Visible version badge: `v2.3.7`
   - `APP_VER`: `2.3.7`
   - v2.3.6 incorrectly retained a visible `v2.3.2` badge and `APP_VER='2.3.4'`.

6. **Preserved sprite data and IDs**
   - 262 sprite records remain.
   - IDs remain unchanged.
   - S3 remains IDs 1–122 as previously defined.
   - S4 remains IDs 200–344 as previously defined.
   - Tracker state, localStorage keys, import/export, layout settings, filters, variants, categories, and other application behavior were not intentionally changed.

### Validation

- 262 unique sprite IDs detected.
- No embedded `data:image/...` payloads remain.
- No `raw.githubusercontent.com` or jsDelivr asset URLs remain.
- All seven known filename exceptions match the exact filenames used by v2.3.6.
- JavaScript extracted from the HTML passes `node --check`.
- The HTML is intended to be served from GitHub Pages at the repository root so `./sprites/...` resolves to the repository's `/sprites/s3/` and `/sprites/s4/` directories.

### Important deployment note

The normal GitHub repository `blob` URL is a source-code viewing page, not the URL that should be used as the running application.

Enable **GitHub Pages** for the repository and run the tracker from its Pages URL, for example:

`https://robertduggan.github.io/fortnite-sprites-assets/`

For the cleanest permanent URL, the v2.3.7 file can eventually be copied/renamed to `index.html`.

### Verification limitation

The GitHub repository could not be fetched directly from this ChatGPT execution environment during this build because GitHub network access is disabled here. The asset filenames and seven exceptions were therefore validated against the supplied v2.3.6 file and its supplied worklog, which documents the repository contents and prior HTTP-200 verification. Live GitHub Pages/image loading should be checked after the file is committed.

