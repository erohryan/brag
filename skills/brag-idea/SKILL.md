---
name: brag-idea
description: Turn a written prompt — an idea, pitch, concept, announcement, or message — into a short animated promo video. Use when someone says "/brag-idea", "make a video about this idea", "animate this pitch", "turn this concept into a promo", or wants a promotional video but has no website, codebase, or document to start from. The prompt is the brief. Renders through the brag engine + Hyperframes.
---

# /brag-idea

No site, no repo, no deck — just an idea. `/brag-idea` turns a prompt into a short animated promo that sells it: a hook, the idea, the few points that make it land, and a clear call to action.

It completes the suite: `/brag` hypes a codebase, `/brag-docs` explains a document, `/brag-idea` promotes **an idea described in words**. All three reuse the same Hyperframes render engine.

## What this skill does

1. **Interprets** the prompt into a concept, audience, promise, supporting points, and a visual metaphor — optionally sharpening claims with light research.
2. **Designs** a visual system for the idea (or adopts the user's assets/brand when supplied).
3. **Plans** a promo storyboard whose length fits how much the idea has to say.
4. **Reuses the brag engine** to compose with Hyperframes and deliver the video.

## Invocation dispatch (must happen first)

Parse the full invocation before doing anything.

```
/brag-idea "A browser extension that turns any recipe into a grocery list in one click"
/brag-idea brief.md
/brag-idea "Our team offsite is moving to Lisbon" --tone cinematic --format vertical
/brag-idea "Launching Tern: async standups for remote teams" --assets ./brand --voice
```

| Option | Values | Default |
|---|---|---|
| _prompt_ | quoted text, or a path to a `.md` / `.txt` brief | required (ask if missing) |
| `--tone` | a `/brag` preset or freeform direction | inferred from the prompt |
| `--format` | `landscape`, `vertical`, `square` | `landscape` |
| `--duration` | seconds | **adaptive** (see Step 2) |
| `--assets` | folder or files (logo, product shots, b-roll) | none — conceptual visuals |
| `--voice` | flag, optionally with a Kokoro voice id | narration off |
| `--no-research` | flag | light research on when claims need it |
| `--no-music` / `--no-sfx` | flag | on |
| `--title` | string | inferred from the prompt |

Narration follows `/brag`: off unless requested. When a specific Kokoro voice or speed is named, pass it to `hyperframes tts` (`--voice <id>`, `--speed <n>`).

## Working method

**Interpret → decide → clarify only the gap.** Do the interpretive work yourself: most prompts carry enough to make a strong video. Ask the user only when the prompt is too thin to promote anything specific (e.g. a single vague word) or when a choice would change the whole video (who it's for, what they should do next). Ask at most 1–3 pointed questions, showing what you already concluded. In an automated / non-interactive run, never ask — make the call, and record every assumption in the plan.

## Skill directory & the brag engine

`<skill-dir>` is the directory containing this `SKILL.md`. `brag-idea` **reuses the `brag` engine** for composition and delivery, so the `brag` skill must be installed alongside it. `<brag-skill-dir>` is the installed `brag` skill's directory — a sibling of this one (e.g. `~/.claude/skills/brag/` globally, `.claude/skills/brag/` per-project, or `skills/brag/` in this repo). It holds the shared music (`<brag-skill-dir>/assets/music/`), SFX (`<brag-skill-dir>/assets/sfx/`), tone definitions (`<brag-skill-dir>/references/tones.md`), and the compose/deliver references. If you cannot locate it, say so and fall back to user-provided or no music.

## Output directory

By default, output goes to `brag-idea-output/`. If that already exists, or the user asks for a fresh run, use `brag-idea-output-YYYY-MM-DD-HHmmss/`. User-supplied assets are copied to `<output-dir>/source-assets/`. If a `brag-marketing/` workspace exists and this video is part of that program, output to `brag-marketing/videos/<idea-slug>/` instead and update the content plan.

---

## Step 1: Interpret the idea

**Read:** [references/step-1-interpret.md](references/step-1-interpret.md)

Turn the prompt into a concept brief: the idea in one line, who it's for, the promise, 2–4 supporting points, the hook, the call to action, and a **visual metaphor** the whole video can hang on. Run light research only to verify or sharpen specific claims. Establish the visual system — the user's assets/brand if supplied, otherwise a palette and type pairing designed from the idea's mood.

**Gate:** You can answer the idea rubric, every factual claim is either from the prompt, verified, or softened, and the visual system is written down.

---

## Step 2: Plan the promo (adaptive length)

**Read:** [references/step-2-plan.md](references/step-2-plan.md)

Write `<output-dir>/brag-plan.md`: hook → idea reveal → supporting beats → call to action, with a conceptual visual for every scene traced back to specific words in the prompt. Length scales with the idea (one sharp idea → ~20s; a multi-point pitch → up to ~60s).

**Gate:** `<output-dir>/brag-plan.md` exists, scene durations sum to the adaptive target, and every scene names what it shows and which part of the prompt it comes from.

---

## Step 3: Compose (reuse the brag engine)

**Read:** The Hyperframes domain skills — `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. Do not enter the generic `hyperframes` intent interview. Before hand-building a named visual treatment (a chart, a terminal window, a map, a confetti burst), check `hyperframes-registry` — a ready block often exists.
**Read:** `<brag-skill-dir>/references/step-3-compose.md` and `<brag-skill-dir>/references/audio.md`.

Write `<output-dir>/composition-brief.md` and build the composition in `<output-dir>/composition/`, following the brag engine's Step 3 with three `brag-idea` overrides:
- **Duration** is the adaptive target from Step 2, not `/brag`'s 15–25s.
- **Source material** is the concept brief and visual system from Step 1 (plus `source-assets/` when supplied), not a project's code.
- **Visuals are conceptual by design** — the brief must carry the per-scene visual metaphors from the plan so Hyperframes builds those, not generic motion.

**Gate:** `npx hyperframes check` passes with zero errors inside `<output-dir>/composition/`.

---

## Step 4: Deliver (reuse the brag engine)

**Read:** `<brag-skill-dir>/references/step-4-deliver.md`.

Validate, render to `<output-dir>/brag.mp4`, pick and bake a best-frame poster `<output-dir>/brag.jpg`, and write `<output-dir>/share-copy.txt`.

**Gate:** `<output-dir>/brag.mp4` exists with a baked poster; share copy is written.

---

## Creative laws for idea promos

These adapt `/brag`'s laws to a video with no product footage to lean on.

- **Specific or nothing.** Every visual must trace to a concrete word, noun, number, or image in the prompt. If a scene could promote any idea, cut it. This is the law that separates a promo from AI filler.
- **One metaphor, owned.** Pick a single visual idea for the concept (the grocery list that writes itself; standups as a relay baton) and develop it across scenes rather than switching visual languages every beat.
- **Show the promise, not the category.** Dramatize the before → after for the viewer, not "innovation" or "the future".
- **Honest.** Never invent statistics, testimonials, customer logos, or awards. A concept mockup of an unbuilt product is fine, but it must read as a concept, not as a real screenshot of a shipped product. Real companies' names and marks only appear if the user supplied them.
- **The hook is everything.** First 2 seconds: the sharpest claim or the most surprising image from the prompt.
- **Readable.** Kinetic type is the workhorse here — so honor `/brag`'s reading-time floors. Fast in, then hold.
- **End with an ask.** The final beat tells the viewer what to do or remember (a URL, a date, "join the waitlist", the one-line promise).
- **Banned:** glowing blobs, gradient meshes, particle fields, stock "AI brain" imagery, abstract spinning shapes, and generic SaaS language ("streamline", "supercharge", "unlock", "elevate").

## Secrecy rule (inherited from /brag)

Everything in the prompt and supplied assets can end up in a public video. Never put secrets, API keys, internal hostnames/URLs, or personal data of private individuals on screen or in share copy. If the prompt contains such data, leave it out or substitute a clearly fictional stand-in and say so in the plan.
