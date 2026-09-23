# Step 2: Plan the informational video (adaptive length)

Write `<output-dir>/brag-plan.md`. A chaptered storyboard that follows the document's arc, reuses its assets, and runs as long as the content warrants — no longer.

## Adaptive duration

Length scales with how much the document contains. Don't force `/brag`'s 15–25s; don't pad to fill time either.

Rough model (tune to the content):

| Source size | Target length |
|---|---|
| 1 infographic / 1–2 slides | ~20–35s |
| 3–5 slides / sections | ~60–90s |
| 6–10 slides / sections | ~90–150s |
| 10+ slides / sections | ~2min+, but consolidate — group related points rather than one chapter per slide |

Budget by chapter: **intro ~5–8s + ~10–20s per key point + takeaway ~6–10s.** Count the key points from rubric Q3, apply the per-point budget, add intro and takeaway. That sum is your target; if `--duration` was passed, honor it and cut/merge points to fit.

Guard against bloat: if the document has 15 points, the video should not have 15 chapters. Pick the points that serve the takeaway; the rest can be a fast montage or dropped. Say what you dropped in the plan.

## Structure — follow the document's arc

```
Title / hook  →  chapter per key point  →  takeaway
```

Each key point becomes one chapter. Order them as the document orders them unless a stronger narrative demands resequencing.

## brag-plan.md structure

```markdown
# Brag-Docs Plan: [Document Title]

## What is this document?
[One sentence — rubric Q1 — plus audience/purpose (Q2).]

## The takeaway
[Rubric Q4 — the one thing to remember. The video builds to this.]

## Duration: [adaptive target] — [why: N key points × budget + intro + takeaway]
## Format: [landscape / vertical / square] — [WxH]
## Narration: [on / off — from ask-each-run]. [If on: one line on voice posture.]

## Visual identity (from the document)
- Background / text / accent: [exact colors, or user-provided]
- Display / body font: [names]
- Source assets available: [list from source-assets/ with what each shows]

## Tone
- Preset: [polished / app-store / default / cinematic / …]
- Creative direction: [freeform, inferred or user-provided]

## Storyboard

### Chapter 0 — Title / hook — [Xs]
[On screen: title, logo (source-assets/logo.png), one-line what-this-is.]
Asset used: [real asset path, or "recreated: …"]
Narration: [line, if narration on — else "none"]
Transition → Chapter 1

### Chapter 1 — [key point] — [Xs]
[On screen. The point stated simply. The chart/image that proves it.]
Asset used: [source-assets/chart-revenue.png — reuse the real chart]
Sequential/interaction: [e.g. "bars grow in", "number counts up", or none]
Narration: [line, or none]
Transition → Chapter 2

[... one chapter per key point ...]

### Chapter N — Takeaway — [Xs]
[The single takeaway on screen. Logo. Optional CTA / source line.]
Asset used: [...]
Narration: [closing line, or none]

**Audio summary:** [one sentence on the music/narration arc.]
```

## Asset-first (reuse what the document already has)

Choosing what to show, in preferred order:

1. **Reuse the document's real asset** — its actual chart, photo, diagram, or the infographic itself (or a crop). This is the point of `brag-docs`: authentic and faithful. Animate it (bars grow, numbers count up, callouts appear) rather than replacing it.
2. **Recreate a data point cleanly** — only when the source asset is too low-res or off-brand to reuse. Recreate it in the document's colors, faithful to the real numbers.
3. **Typographic treatment** — for text-only points, big clear type in the document's fonts and colors.

Never invent a chart or a statistic the document doesn't contain. Faithfulness is a creative law here.

## Reading time (comprehension is the job)

Informational content lives or dies on being readable. Apply `/brag`'s reading-time floors, but lean generous:

- Short label / stat: ~1s settled.
- A sentence: ~0.35s per word, minimum ~1.5s.
- A chart the viewer must interpret: hold ~2–3s after it settles.

If narration is on, pace visuals to the narration, not the other way around — the voice sets the tempo and text supports it.

## Narration (if enabled)

Write one narration line per chapter directly in the storyboard. Narration should **explain and connect**, not read the on-screen text verbatim. It carries the story between chapters; on-screen text and assets carry the evidence. Keep it natural and concise. This is the script Hyperframes/Kokoro will voice.

## Music & SFX

Bias to a calm, professional bed for informational content (`polished`/`app-store` energy). Use the shared bundled tracks at `<brag-skill-dir>/assets/music/`. SFX stay sparse and motion-matched (a soft tick on a count-up, a light reveal on a chart). Leave exact files/timestamps to the compose step, as `/brag` does.

## Gate

`<output-dir>/brag-plan.md` exists. Chapter durations sum to the adaptive target. Every chapter names the real asset it reuses (or the recreated element, with why). If narration is on, every chapter has a narration line.
