# Step 1: Interpret the idea

The prompt is the whole brief. Your job here is to pull a promotable concept out of it — and to decide what the video will *look* like, since there's no product footage to fall back on.

## Read the prompt closely

If the prompt is a path, read the file. Then mine it for:

- **Nouns and images** — the concrete things named (a recipe, a relay baton, Lisbon, a grocery list). These are your raw visual material.
- **Numbers** — any figure the prompt states. Numbers animate well (count-ups, bars) but only use ones that are actually there.
- **The verb** — what the idea *does* for someone. This becomes the promise.
- **Voice cues** — words that signal tone (playful, urgent, premium, deadpan). Map them to a `/brag` tone preset (`<brag-skill-dir>/references/tones.md`), preserving any freeform direction the user gave.
- **The ask** — a URL, date, waitlist, event, or action the prompt wants the viewer to take.

## The idea rubric

Answer all of these and write them into the plan. If the prompt doesn't say, decide — and mark it as an assumption.

```
1. The idea in one line.        What is being promoted, in plain words?
2. Who it's for.                The specific viewer who should care.
3. The promise.                 What changes for them? (the before → after)
4. Supporting points (2–4).     The reasons to believe or the key features, from the prompt.
5. The hook.                    The sharpest claim or most surprising image — the first 2 seconds.
6. The visual metaphor.         One visual idea the whole video develops (see below).
7. The call to action.          What the viewer should do or remember at the end.
8. Tone.                        Preset + freeform direction.
9. Claims to check.             Any factual claim that needs verifying or softening.
```

## Choosing the visual metaphor

With no UI to show, the metaphor *is* the video. Good metaphors are:

- **Literal to the prompt** — built from its nouns (the recipe card whose ingredients fly into a checklist), not a generic stand-in (a lightbulb for "idea").
- **Extendable** — it can carry the hook, each supporting point, and the payoff without switching visual language.
- **Cheap to animate well** — shapes, cards, type, lines, and simple objects that Hyperframes can build crisply.

Useful building blocks: kinetic typography, before → after splits, a diagram or flow that builds step by step, a stat or counter reveal, a checklist that fills, a timeline, a concept mockup of the product (clearly a concept), a map pin or route for place-based ideas.

Pick one, write a one-sentence description of it, and name 2–3 moments where it transforms.

## Light research (optional)

Only when rubric Q9 lists claims worth checking, and only if `--no-research` wasn't passed. Use a few `WebSearch` queries to:

- **Verify** a factual claim the prompt makes about the world ("remote teams lose X hours to meetings").
- **Sharpen** a vague claim into a specific, true one.
- **Ground** timing hooks (a trend, a season, an event) that make the idea feel current.

Rules: never introduce a statistic the research doesn't support; if a claim can't be backed, soften it ("hours lost to status meetings") or drop it. Cite the source in the plan. Skip gracefully when offline. This is framing, not a report — stop after a handful of queries.

## The visual system

**If the user supplied assets (`--assets`)** — copy them to `<output-dir>/source-assets/`, catalog each (what it is, where it fits), and derive the palette and type from them (logo colors, brand fonts). Assets beat invention: use the real logo, the real product shot.

**If a brand is named but no assets are supplied** — in interactive runs, ask once whether they have a logo or colors to share. In automated runs, don't imitate the real brand's marks; design an original look and note the assumption.

**Otherwise, design one from the idea's mood** and write it down:

- Background, text, and one accent color (exact values) — chosen for the tone, with WCAG AA contrast for text.
- A display face and a body face (Google Fonts or system).
- One motif (a shape, texture, or line quality) that ties to the metaphor.

Keep it restrained: one accent, one motif. A consistent small system reads as designed; a busy one reads as generated.

## Gate

The rubric is answered (assumptions marked), every factual claim is from the prompt, verified, or softened, and the visual system and metaphor are written down.
