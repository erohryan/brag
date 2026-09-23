# Step B: Discover assets

**Find what already exists and prefer it.** For marketing content, real assets — a real logo, a real screenshot, real footage — beat anything recreated from scratch. The `/brag` engine's old instinct was to rebuild UI in HTML; here we invert that: catalog what's on hand first, so production reuses and only recreates to fill a genuine gap.

Run this alongside Step A so features and assets stay cross-referenced.

## Sweep the repo (investigate first)

Hunt for reusable material across the whole project, not just `public/`:

- **Brand** — logos (SVG/PNG), wordmarks, icon sets, favicon, brand color tokens (CSS custom properties), licensed/self-hosted fonts.
- **Imagery** — screenshots, product photos, illustrations, hero art, Open Graph / social preview images. Check `public/`, `assets/`, `static/`, `docs/assets/`, `src/assets/`.
- **Motion** — existing videos, screen recordings, GIFs, Lottie/animation JSON. Search for `.mp4`, `.webm`, `.mov`, `.gif`, `.json` animation files anywhere in the repo.
- **Copy assets** — testimonials, real metrics/numbers, case studies, press quotes, taglines already written.
- **External-but-declared** — asset paths referenced in code or via CDN, a design-system dependency, a `brand/` or `press-kit/` folder.

## Catalog each asset

Record in `brag-marketing/asset-inventory.md`, one row per asset:

- **Type** — brand / imagery / motion / copy.
- **Source / path** — where it is.
- **Serves feature(s)** — map it to the feature-slugs from Step A. An asset with no feature is still worth noting.
- **Usability for video** — ready / needs work (low-res, wrong aspect, placeholder) / not usable.
- **Caveat** — contains PII, is a placeholder, licensing limits, etc.

Copy assets worth keeping into `brag-marketing/assets/` and mark them ★ in the inventory, so every future run has them.

## Then clarify with the user

After cataloging what's connected, ask the user two things — informed by the gaps you found:

1. **Share now:** "For [feature], I don't have footage or a clean screenshot. Do you have a screen recording, a hi-res logo, or brand footage you can drop in?" Point them at `brag-marketing/assets/`.
2. **Save for later:** "Anything you want to add to the asset repo for future releases — brand kit, product shots, b-roll — even if we're not using it in this batch?"

Copy anything they share into `brag-marketing/assets/`, add it to the inventory, and note whether it's for this batch or saved for later releases.

## Feed the plan

Each feature's assets-on-hand and gaps flow into the content plan (Step E): production reuses first, and the plan surfaces missing assets openly instead of silently faking them.

## Gate

Every reusable asset is cataloged with path, type, feature mapping, and usability. Keepers are copied into `brag-marketing/assets/`. The user has been asked about assets to share now and assets to save for later.
