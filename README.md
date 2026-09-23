# /brag

**You built it. Now brag.**

[![the /brag launch site — you built it, now brag](docs/assets/hero.png)](https://latent-spaces.github.io/brag/)

`/brag` is a Claude Code skill that turns the project you created into a short, shareable launch video — music, motion, and share copy included. One command, powered by [Hyperframes](https://hyperframes.heygen.com/).

The looping video on the [launch site](https://latent-spaces.github.io/brag/) was made by `/brag` on this very repo.

## Three skills: a video, a content program, or a document explainer

- **`/brag`** — the engine. Turns a project (or one feature of it) into a single short video. Great on its own.
- **`/brag-strategy`** — the brain. Understands your product **feature by feature**, maps the **customer outcome** each one drives, adds light **current-market framing**, then proposes a set of videos to make — you pick, it plans, and `/brag` renders each one. Built for shipping marketing content **steadily over time**, not a one-off promo.
- **`/brag-docs`** — the explainer. Turns a **PDF, slide deck, or infographic** into an engaging informational video, reusing the document's own charts, images, and color scheme. Length adapts to the document; narration optional. See [`skills/brag-docs/SKILL.md`](skills/brag-docs/SKILL.md).

### brag studio — a UI for brag-docs

[`studio/`](studio/) is a local web app for `/brag-docs`: **upload a document, watch it become a video, and browse a searchable history** of everything you've made. It runs the `brag-docs` agent headlessly on your machine and streams progress into the page. Run it with `cd studio && npm install && npm run dev` (needs the skills, FFmpeg, and Hyperframes installed locally — see [`studio/README.md`](studio/README.md)).

`/brag-strategy` keeps a persistent `brag-marketing/` workspace (a product profile, an asset inventory, a content plan, and a reusable asset repo) so the program compounds across runs. See [`skills/brag-strategy/SKILL.md`](skills/brag-strategy/SKILL.md).

**Asset-first:** both skills prefer real assets you already have — logos, screenshots, existing footage — and recreate UI only to fill gaps.

## Install

```bash
/plugin marketplace add latent-spaces/brag
/plugin install brag@brag
```

Then run `/brag` inside any project.

**Any other agent** — one command via the [`skills`](https://github.com/vercel-labs/skills) CLI (Cursor, Codex, Copilot, Gemini CLI, opencode, and more):

```bash
npx skills add https://github.com/latent-spaces/brag --skill brag
```

Add `-g` to install globally (available in every project); drop it to scope to the current one. ([browse on skills.sh](https://www.skills.sh/latent-spaces/brag/brag))

<details>
<summary>No installer? Copy the skill directly.</summary>

```bash
rsync -a --exclude '.DS_Store' skills/brag/ ~/.claude/skills/brag/
```

Restart Claude Code after copying.
</details>

### Also works with

This repo exposes the skill at every agent's standard discovery path via symlinks. No extra config needed.

| Agent | How it discovers |
|---|---|
| **Google Antigravity** | Auto-detects from `.agents/skills/brag/` at project root or `~/.gemini/config/skills/brag/` globally |
| **opencode** | Auto-detects from `.opencode/skills/brag/` at project root |
| **Codex CLI** | Reads `.agents/skills/brag/`, walking up to repo root |
| **Claude Code** | Also reads `.claude/skills/brag/` (in addition to the `.claude-plugin/` marketplace install above) |
| **Other agents** | Point custom instructions at `skills/brag/SKILL.md` — see [`docs/other-agents.md`](docs/other-agents.md) |

> **Windows users:** Git requires `git config core.symlinks true` (or `git clone -c core.symlinks=true`) and Windows Developer Mode or Administrator privileges to create symlinks. If symlinks don't work on your system, copy `skills/brag/` to the agent's skill directory manually instead.

## Use it

From any project directory, ask your agent:

```text
let's /brag
```

To plan an ongoing content program instead of a single video:

```text
/brag-strategy
```

Blank, it surveys the whole product and pitches a top-5 of videos to make (one recommended). Focus it with a prompt — `/brag-strategy "the new export feature"` — to ideate on one theme. You pick which ideas to build; it writes a `brag-marketing/content-plan.md` and hands each choice to `/brag` to render into `brag-marketing/videos/<feature>/`.

To turn a document into a video:

```text
/brag-docs report.pdf
```

Works on PDFs, PowerPoint/Keynote decks, and infographic images. It extracts the document's charts, images, colors, and fonts, then builds an informational video whose length matches the content. It asks whether to narrate, and if the document has no usable visuals it asks you for assets.

Or steer the tone:

```text
/brag --tone "fake Series A launch from 2016"
```

Voiceover is off by default. Enable it explicitly with:

```text
/brag --voice
```

Narration uses Kokoro through Hyperframes when enabled.

You get a `brag-output/` folder with the plan, a composition brief, share copy, and the rendered `brag.mp4`.

## How it works

`/brag` owns the story — the product angle, tone, and which moments to show. It hands a focused brief to [Hyperframes](https://hyperframes.heygen.com/), which builds, times, and renders the video.

## Requirements

- An agent that supports Agent Skills — Claude Code, opencode, Codex CLI, or any agent with custom instructions (see "Also works with" above)
- Node.js 22+
- FFmpeg on `PATH`
- Hyperframes CLI — `npx hyperframes` (check it with `npx hyperframes doctor`)

## What's in this repo

- `skills/brag/` — the render engine, references, and bundled music + SFX
- `skills/brag-strategy/` — the marketing-program planner (feature understanding → outcomes → market framing → content plan)
- `skills/brag-docs/` — the document explainer (PDF / deck / infographic → informational video; reuses the brag engine)
- `studio/` — local web UI for `brag-docs` (upload → generate → searchable video library)
- `examples/` — fake product sites used as a benchmark suite
- `docs/` — the launch site (GitHub Pages)
- `.claude-plugin/` — plugin manifest + marketplace catalog
- `.claude/skills/{brag,brag-strategy,brag-docs}/` — symlinks → `skills/…` (Claude Code discovery)
- `.agents/skills/{brag,brag-strategy,brag-docs}/` — symlinks → `skills/…` (Codex CLI + opencode discovery)
- `.opencode/skills/{brag,brag-strategy,brag-docs}/` — symlinks → `skills/…` (opencode discovery)

## Credits

- Music — [ende.app](https://ende.app/en) "Happy Beats / Business Moves"
- Sound effects — [Kenney](https://kenney.nl/)
- Video generation — [Hyperframes](https://hyperframes.heygen.com/)
- Fake demo sites — built with [Impeccable](https://impeccable.style/)

## Contributing

Contributions, ideas, and new demo brags are welcome — open an issue or a PR.

## Star History

<a href="https://www.star-history.com/?type=date&repos=latent-spaces%2Fbrag">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=latent-spaces/brag&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=latent-spaces/brag&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=latent-spaces/brag&type=date&legend=top-left" />
 </picture>
</a>