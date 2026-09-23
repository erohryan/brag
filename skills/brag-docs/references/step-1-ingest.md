# Step 1: Ingest the document

Read the source document and pull out everything the video needs: its content, its narrative structure, its visual identity, and — most importantly for an asset-first video — its **reusable assets**.

## Handling each format

**PDF** — Read it directly with the Read tool's `pages` parameter (it renders pages, including charts and images). For a long PDF, read in page ranges. Note the page each key point and chart lives on.

**Infographic / image** (`.png`, `.jpg`, `.svg`, `.webp`) — Read it directly; the tool views the image. This *is* the asset — plan to reuse the whole thing or crops of it. For SVG, also read the source to pull exact colors and any embedded text.

**PowerPoint / Keynote** (`.pptx`, `.key`) — these are ZIP archives.
- Extract media: `unzip -o "<file>" -d <output-dir>/source-assets/pptx-raw` then copy images from `ppt/media/` (PPTX) into `source-assets/`.
- Get slide text: slide XML lives at `ppt/slides/slide*.xml`; the human-readable text is in `<a:t>` tags. Read those to reconstruct each slide's content and order.
- If `libreoffice` or `soffice` is available, a cleaner route is to convert to PDF first (`soffice --headless --convert-to pdf <file>`) and then read the PDF as above — this preserves layout and lets you view each slide. Prefer this when available.
- `.key` (Keynote): if it can't be unzipped usefully, ask the user to export it to PDF or PPTX.

**A folder** — treat each file as a section/chapter in document order (sort by filename). Ingest each with the rules above.

## Extract the reusable assets (asset-first)

Save every reusable visual into `<output-dir>/source-assets/`, because reusing the document's own material is the whole point:

- **Charts / graphs / data viz** — the highest-value assets. Extract as images; note what each shows.
- **Images / photos / illustrations** embedded in the document.
- **Logo / wordmark** — usually on the title or footer.
- **Icons / diagrams.**

For each saved asset, note: filename, what it is, which point/chapter it supports, and usability (resolution, cropping needed).

## Extract the visual identity

- **Color scheme** — the document's dominant background, primary text, and accent colors. From a PDF/image, read them off the design; from SVG/PPTX theme XML (`ppt/theme/theme1.xml`), pull exact hex values. Record exact values.
- **Typography** — the display (heading) font and body font, if identifiable.

These carry into the composition so the video looks like an extension of the document.

## Fallback: document has no usable visuals or brand

If the document is text-only, low-quality, or has no brand identity, **ask the user** before planning:

> "This document doesn't have reusable visuals or a clear color scheme. Do you have a logo, brand colors, or any images/footage I should use? Otherwise I'll design a clean neutral look for it."

Save anything they provide into `source-assets/`. If they provide nothing, proceed with a clean neutral palette and note that in the plan.

## The document rubric

Answer all of these before Step 2. Write them into the plan.

```
1. What is this document about?         One sentence.
2. Who is it for / what's its purpose?  Audience + intent (inform, persuade, report, teach).
3. What's the narrative arc?            The ordered key points / sections → these become chapters.
4. What's the single takeaway?          The one thing a viewer must remember.
5. What data is worth animating?        Stats, numbers, charts that carry the message.
6. What assets are reusable?            List from source-assets/ — charts, images, logo.
7. What's the visual identity?          Background / text / accent colors + fonts (or user-provided).
8. How much content is there?           Count pages/slides/sections → drives adaptive length (Step 2).
9. Narration this run?                  From the ask-each-run policy (or --voice/--no-voice).
10. Tone?                               Preset (bias polished/app-store) or freeform; preserve user direction.
```

## What to skip

Don't carry into the plan: secrets, API keys, internal hostnames/URLs, real customer/user PII, or credentials found in the document (see the secrecy rule in SKILL.md). Substitute fictional stand-ins if such data is part of the story being shown.

## Gate

You can answer the 10-question rubric, and reusable assets (extracted or user-provided) are saved in `<output-dir>/source-assets/`.
