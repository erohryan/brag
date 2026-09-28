# Step 2: Plan the promo (adaptive length)

Write `<output-dir>/brag-plan.md`. One focused page: the contract Hyperframes builds from.

## Adaptive duration

Length follows how much the idea has to say — never padded.

| What the prompt carries | Target length |
|---|---|
| One sharp idea, one claim | ~15–25s |
| Idea + 2–3 supporting points | ~25–40s |
| Idea + 4 points, or a story with a setup | ~40–60s |

Budget: **hook ~2–3s + reveal ~3–4s + ~5–8s per supporting point + call to action ~3–4s.** If `--duration` was passed, honor it and cut points to fit. Cap at ~60s unless the user explicitly asks for longer; if the prompt has more than four points, pick the strongest and say what was dropped.

## Structure

```
Hook  →  Idea reveal  →  Supporting beats (the metaphor develops)  →  Payoff + call to action
```

The metaphor from Step 1 should visibly transform across scenes — that's what makes an idea promo feel like a story instead of a slideshow.

## brag-plan.md structure

```markdown
# Brag-Idea Plan: [Title]

## The idea
[One line — rubric Q1.] For [who — Q2]. Promise: [Q3].

## Assumptions
[Everything decided that the prompt didn't state. "None" if none.]

## Claims & sources
[Each factual claim on screen → "from prompt" / "verified: <source>" / "softened from …".]

## Visual metaphor
[One sentence. Plus the 2–3 moments where it transforms.]

## Visual system
- Background / text / accent: [exact values]
- Display / body font: [names]
- Motif: [one line]
- Supplied assets: [list from source-assets/, or "none — conceptual visuals"]

## Tone
- Preset: [preset]  ·  Creative direction: [freeform]

## Duration: [target]s — [why]    ## Format: [format] — [WxH]
## Narration: [off / on — voice id, speed]

## Storyboard

### Scene 1 — Hook — [Xs]
On screen: [exactly what appears, including any text verbatim]
From the prompt: ["the words this scene dramatizes"]
Motion: [how it enters / transforms; any sequential reveal]
Narration: [line, or none]
Audio intent: [what the sound does]
Transition → Scene 2

[... one block per scene ...]

### Scene N — Call to action — [Xs]
On screen: [the ask + the one-line promise]
From the prompt: ["…"]

## Share copy (draft)
[One sentence for X/LinkedIn. Specific, not corporate.]

**Audio summary:** [one sentence]
```

## The "From the prompt" line is mandatory

Every scene must quote the part of the prompt it dramatizes. If you can't point to one, the scene is filler — cut it or rebuild it from something the prompt actually says. This single rule is what keeps idea promos from sliding into generic AI video.

## Choosing what each scene shows

In preferred order:

1. **A supplied asset** — the real logo, product shot, or footage from `source-assets/`.
2. **The metaphor, transforming** — the recurring visual doing something new that expresses this beat.
3. **A concrete diagram / before → after / counter** — when the beat is a mechanism or a number.
4. **Kinetic typography** — the prompt's own sharpest phrasing, big, with motion that serves the words.

A concept mockup of the product is allowed under 2 or 3, styled so it reads as a concept (simplified, on-brand, no fake real-world data).

## Reading time and pace

Idea promos are text-heavy, so apply `/brag`'s floors strictly: short label ~0.8s settled; a sentence ~0.3s per word, minimum ~1.2s. Keep pace through motion and cuts, not by flashing text. Sequential text reveals hold each item to the floor.

## Narration (if enabled)

One line per scene. Narration carries the argument; on-screen type carries the hook words and proof. Don't read the screen aloud. Keep it conversational and pace scenes to the voice.

## Music & SFX

Pick the bed from `<brag-skill-dir>/assets/music/` to match the tone — idea promos usually want energy (a clear beat to cut to). SFX are motion-matched and sparse: a tick on a checklist fill, a soft hit on the reveal. Leave exact files and timestamps to the compose step.

## Gate

`brag-plan.md` exists; scene durations sum to the adaptive target; every scene has a "From the prompt" line and names what it shows; assumptions and claim sources are listed.
