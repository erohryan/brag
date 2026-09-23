---
name: brag-docs
description: Turn a static document — a PDF, PowerPoint/Keynote deck, or infographic — into an engaging informational video. Use when someone says "/brag-docs", "turn this PDF into a video", "make a video from these slides", "animate this infographic", or wants to turn dense/static information into something visual. Reuses the document's own assets and color scheme; asks for assets if the document has none. Renders through the brag engine + Hyperframes.
---

# /brag-docs

Static documents don't hold attention. `/brag-docs` turns a PDF, a slide deck, or an infographic into a short **informational video** — following the document's own structure, reusing its own charts, images, colors, and logo, and narrating the story when that helps.

It is the informational sibling of `/brag`: `/brag` hypes a product, `/brag-docs` *explains* a document. Both reuse the same Hyperframes render engine.

## What this skill does

1. **Ingests** the document — extracts its content, structure, visual identity, and reusable assets.
2. **Plans** an informational video whose length adapts to how much the document contains.
3. **Reuses the brag engine** to compose the video with Hyperframes and deliver it.

## Invocation dispatch (must happen first)

Parse the full invocation before doing anything.

```
/brag-docs report.pdf
/brag-docs deck.pptx
/brag-docs infographic.png
/brag-docs docs/                 (a folder of documents / a set of slides)
/brag-docs q3-results.pdf --tone polished
```

Options — the same as `/brag`, plus how the source is named:

| Option | Values | Default |
|---|---|---|
| _source_ | path to a `.pdf` / `.pptx` / `.key` / image / folder | required (ask if missing) |
| `--tone` | preset or freeform | inferred (bias to `polished` / `app-store` for informational content) |
| `--format` | `landscape`, `vertical`, `square` | `landscape` |
| `--duration` | seconds | **adaptive** (see Step 2) |
| `--voice` / `--no-voice` | flag | **ask each run** (see below) |
| `--no-music` / `--no-sfx` | flag | on |
| `--title` | string | inferred from the document |

If no source is given, ask the user for the document (and see the asset-fallback in Step 1).

## Narration policy — ask each run

Voiceover is decided per run. If the invocation contains `--voice` or `--no-voice`, honor it. Otherwise, **before planning, ask the user once**: "Do you want narration on this one? Informational videos often land better with a voice reading the story." Set `voice.enabled` from their answer. When enabled, narration uses Kokoro via Hyperframes (single-provider, like `/brag`).

## Skill directory & the brag engine

`<skill-dir>` is the directory containing this `SKILL.md`. `brag-docs` **reuses the `brag` engine** for composition and delivery, so the `brag` skill must be installed alongside it (it will be, in this suite). `<brag-skill-dir>` is the installed `brag` skill's directory — a sibling of this one (e.g. `~/.claude/skills/brag/` when installed globally, `.claude/skills/brag/` per-project, or `skills/brag/` in this repo). It holds the shared bundled music (`<brag-skill-dir>/assets/music/`) and SFX (`<brag-skill-dir>/assets/sfx/`) and the compose/deliver references. If you cannot locate it, say so and fall back to user-provided or no music.

## Output directory

By default, output goes to `brag-docs-output/`. If that already exists, or the user asks for a fresh run, use a timestamped variant `brag-docs-output-YYYY-MM-DD-HHmmss/`. Extracted document assets go under `<output-dir>/source-assets/`. If a `brag-marketing/` workspace exists and this video is part of that program, output to `brag-marketing/videos/<doc-slug>/` instead and update the content plan.

---

## Step 1: Ingest the document

**Read:** [references/step-1-ingest.md](references/step-1-ingest.md)

Extract the document's content, narrative structure, visual identity (colors + fonts), and — critically — its **reusable assets** (charts, images, diagrams, logo). Save extracted assets to `<output-dir>/source-assets/`. If the document has no usable visuals or brand, **ask the user** for assets and a color scheme.

**Gate:** You can answer the document rubric, and reusable assets (or a user-provided set) are saved to `source-assets/`.

---

## Step 2: Plan the informational video (adaptive length)

**Read:** [references/step-2-plan.md](references/step-2-plan.md)

Write `<output-dir>/brag-plan.md`: a chaptered informational storyboard that follows the document's structure, reuses the extracted assets, and whose total duration **scales with the document** (a single infographic → ~30s; a multi-slide deck → up to ~2min+). If narration is on, write the per-chapter narration.

**Gate:** `<output-dir>/brag-plan.md` exists with a storyboard whose durations sum to the adaptive target, and every chapter names the real asset (or recreated element) it shows.

---

## Step 3: Compose (reuse the brag engine)

**Read:** The Hyperframes domain skills — `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. Do not enter the generic `hyperframes` intent interview.
**Read:** `<brag-skill-dir>/references/step-3-compose.md` and `<brag-skill-dir>/references/audio.md`.

Write `<output-dir>/composition-brief.md` and build the composition in `<output-dir>/composition/`, following the brag engine's Step 3 — with two `brag-docs` overrides:
- **Duration** is the adaptive target from Step 2, not `/brag`'s 15–25s.
- **Assets-first**: the brief's source material is the extracted `source-assets/`; recreate only to fill gaps.

**Gate:** `npx hyperframes check` passes with zero errors inside `<output-dir>/composition/`.

---

## Step 4: Deliver (reuse the brag engine)

**Read:** `<brag-skill-dir>/references/step-4-deliver.md`.

Validate, render to `<output-dir>/brag.mp4`, pick and bake a best-frame poster `<output-dir>/brag.jpg`, and write `<output-dir>/share-copy.txt`.

**Gate:** `<output-dir>/brag.mp4` exists with a baked poster; share copy is written.

---

## Creative laws for informational video

These adapt `/brag`'s laws to the explain-a-document genre.

- **Faithful.** The video must represent the document accurately. Never invent stats or claims the document doesn't make.
- **Asset-first.** Reuse the document's real charts, images, and logo. A recreated chart is a fallback, not the goal.
- **On-brand.** Use the document's own colors and fonts so the video reads as an extension of it. If none exist, use the user-provided palette.
- **Clear over clever.** Informational pacing favors readability and comprehension over hype. Hold text long enough to read; let each point land.
- **Structured.** Follow the document's arc: intro → key points (one per chapter) → takeaway.
- **Engaging, not dry.** Motion, sequencing, and (optionally) narration turn a static page into something people watch to the end.
- **No generic filler.** Every visual belongs to *this* document — its data, its imagery, its story.

## Secrecy rule (inherited from /brag)

Everything extracted can end up on screen in a video the user posts publicly. Never carry secrets, API keys, internal hostnames/URLs, real customer/user PII, or credentials from the document into the plan, composition, video, or share copy. If the document contains such data, substitute plausible fictional stand-ins and say so in the plan.
