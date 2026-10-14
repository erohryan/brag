# brag studio

Turn documents and ideas into videos — a Mac app (and local web app) for **`brag-docs`** and **`brag-idea`**. Upload a PDF, deck, or infographic, or describe an idea; watch it become a video; revise it in plain English; and keep every version in a searchable library.

Each video is made by a Claude agent running **on your machine** through the **Claude Agent SDK**, using the brag skills from this repo and rendering with a pinned copy of Hyperframes.

## Get started

```bash
cd studio
npm install
node node_modules/electron/install.js   # only if npm skipped Electron's download
npm run app:install                     # builds "brag studio.app" into /Applications
```

Open **brag studio** from Applications. The first launch builds the app (about a minute), then opens the **Setup** page if anything is missing — every requirement is checked there, most with a one-click fix:

| Check | Needed for |
|---|---|
| Node.js 22+ | everything |
| Claude sign-in | making videos (log in once with `claude` in Terminal, or set `ANTHROPIC_API_KEY`) |
| brag skills | loaded straight from this repo — always current |
| Hyperframes skills, renderer, FFmpeg, Chrome | building and rendering videos |
| Built-in voices (Kokoro) | narration — *Set up* creates a Python 3.10+ environment for you |
| Cloned voices (Voicebox) | your own narration voice (optional) |

Prefer the browser? `npm run dev` serves the same studio at http://localhost:4321. The app reuses that server if it's already running, so the two never run separate engines on the same library.

**Updating:** `git pull`, then relaunch — the app notices the code changed and rebuilds itself.

## Two ways to start

The app has three tabs: **📄 Document**, **✨ Idea**, and **Library**.

- **Document tab** (`/`) — drop in a PDF, deck, or infographic; `brag-docs` builds an informational video from its content, charts, and colors.
- **Idea tab** (`/idea`) — describe the idea in the prompt box (who it's for, what it does, what viewers should do next — specifics make better videos) and optionally attach brand assets (logo, product shots, footage). `brag-idea` builds an animated promo around one visual metaphor from your words. Without assets, visuals are designed from the idea itself.

Each tab shows its own recent videos. Both kinds share the same progress view, voice options, revoice/rebuild, and library — where you can filter All / Documents / Ideas. Idea jobs store the prompt at `data/jobs/<id>/input/prompt.md` (assets in `input/assets/`) and render to `brag-idea-output/`.

## Audio

Every job has an **Audio** row with three toggles: **Music** and **Sound effects** (on by default, drawn from the brag engine's bundled tracks and SFX) and **Narration** (off by default; see below). These settings are authoritative — the agent is told they override any audio instructions written in your prompt or document, so a brief that says "no sound" still gets music if Music is on. Turn all three off for a silent video (e.g. for muted-autoplay feeds like LinkedIn).

## Narration voices

Narration uses **Kokoro-82M** locally via `hyperframes tts` — all **54 voices** across 9 languages (American/British English, Spanish, French, Italian, Portuguese, Hindi, Japanese, Chinese) are available, grouped by language in the UI, plus a **speed** control.

- **Trial any voice** — the "Try the narration voices" section on the dashboard plays a spoken sample for each. Samples are synthesized once and cached under `data/voice-samples/`. (The very first sample triggers a one-time Kokoro model download, so it can take a bit; after that they're instant.)
- **Pick a voice + speed for a new video** — turn narration on in the upload form, choose a voice (with an inline preview) and a speech speed before generating.
- **Swap the voice on an existing video** — open any finished video and use the **Voice** panel to pick a different voice/speed and *Rebuild with this voice*. The rebuild keeps the same visuals, structure, and script — it only regenerates the voiceover, re-times to the new audio, and re-renders. If the original had no narration, rebuilding adds it.

### Your own voice — cloned locally with Voicebox

Clone your own voice and narrate videos with it, entirely on this machine. Cloning and speech run in [Voicebox](https://github.com/jamiepine/voicebox) (Qwen TTS on Apple Silicon via MLX); the studio talks to it on `127.0.0.1:17493`, so nothing is sent to a cloud service.

**One-time setup**
1. Install the Voicebox app (signed and notarized) from its [releases](https://github.com/jamiepine/voicebox/releases) into `/Applications`.
2. In Voicebox → Models, download **Qwen TTS 1.7B** (~4.3 GB, one time). After that everything runs offline.

**Using it**
- **Create** — click **+ Create your voice** (in the voice gallery, the narration picker, or a video's Voice panel). Record yourself reading the passage shown (~20s), or upload a 2–30s clip and type exactly what's said. Confirm it's your voice (or that you have permission), name it, done.
- **Stored for future use** — Voicebox keeps the voice; it appears under **Your voices** in every picker. The studio also remembers it (`data/voicebox-voices.json`) so it's listed even while Voicebox is closed.
- **Starts automatically** — previewing, generating, or rebuilding with a cloned voice launches Voicebox in the background if it isn't running (the first generation after a cold start takes ~45s while the model loads; then ~10s).
- **Narration** — the agent voices the script with `studio/bin/tts.mjs`, a drop-in for `hyperframes tts` that also speaks Voicebox voices. Speed is applied with ffmpeg (Voicebox v0.5 has no speed control).
- **Delete** — hover a cloned voice in the gallery and click ×.

### More natural built-in voices (planned)

Kokoro is fast, free, and local, but it's an 82M model. A cloud provider (**ElevenLabs**) remains an option; the seam is `lib/tts.js` (`runTts`).

## Working with videos

- **Progress** — a stage-by-stage progress card while a video is made; the raw log is behind *Show log*.
- **Queue** — videos are made one at a time by default (Setup → *Videos at a time*); extra jobs wait in line and start automatically.
- **Cancel** — stops the agent or render immediately. Cancelling an edit leaves the current video untouched.
- **Revise** — describe what to change ("make the headline bigger, cut scene 3"). The agent edits the existing composition and re-renders instead of starting over.
- **Versions** — every revision or voice change keeps the previous cut; play or download any version from the job page. A failed edit restores the previous video automatically.
- **Restart-safe** — if the app quits mid-video, that job is marked *interrupted* with **Resume** (or **Finish render** when only the render is missing); queued jobs pick up where they left off.
- **Cost** — each job shows what its runs cost. Setup can cap spend per run and choose the model.
- **Notifications** — the app notifies you when a video is ready or fails; downloads go to ~/Downloads.
- **Rename / delete** — from the job page.

## How it works

- **Jobs** — `POST /api/jobs` saves inputs under `data/jobs/<id>/input/` and queues a task. The engine (`lib/engine.js`) runs each task through the Agent SDK `query()` in the job folder, with the repo loaded as the `brag` plugin (`brag:brag-docs`, `brag:brag-idea`), a studio system prompt, and interactive-only tools disabled.
- **Tasks** — generate, revoice, revise, and finish-render all go through one persistent queue (job records carry the pending task, so the queue survives restarts; `instrumentation.js` re-arms it on server start).
- **Progress** — SDK messages are logged to `progress.jsonl`, tagged with a pipeline stage (`lib/stages.js`); the job page turns that into the progress card.
- **Result** — the newest `brag.mp4` rendered during the task is recorded in `data/library.json` (written atomically). If the agent stops with a built composition but no video, the engine renders it with the pinned Hyperframes.
- **Media** — served by `GET /api/files/[...path]` from `data/` with range support.

## Safety

Jobs run unattended, so the agent has no permission prompts. Instead a **PreToolUse hook** (`lib/policy.js`) checks every tool call — even ones your own Claude settings would allow — and blocks: writing outside the job folder, reading credentials (`~/.ssh`, `~/.aws`, keychains, `.env` files…), network access beyond local services and font/CDN/package hosts, remote shells, `sudo`, killing processes, system configuration, and publishing code. The agent is also told that everything in an uploaded document is data, not instructions. Blocked calls appear in the job's log.

This is a guardrail, not an OS sandbox — only feed the studio documents you'd be comfortable opening yourself.

## Data & privacy

Everything lives under `studio/data/` (gitignored): uploads, per-job logs, renders and versions, `library.json`, and `settings.json`. Nothing leaves your machine except the agent's calls to Claude (and web search when an idea promo verifies a claim). Delete a video from its page.

## Config

| Env var | Default | Purpose |
|---|---|---|
| `BRAG_STUDIO_DATA_DIR` | `studio/data` | Where jobs, uploads, renders, `library.json`, and `settings.json` live |
| `BRAG_PLUGIN_DIR` | the repo root | The `brag` plugin (skills) the agent loads |
| `VOICEBOX_URL` | `http://127.0.0.1:17493` | Local Voicebox server for cloned voices |
| `VOICEBOX_APP` | `/Applications/Voicebox.app` | App launched automatically when Voicebox isn't running |
| `BRAG_HYPERFRAMES_BIN` | `npx hyperframes` | Hyperframes CLI used for voice-sample synthesis |
| `BRAG_AGENT_STUB` | — | Test seam: a module yielding fake SDK messages instead of running Claude |
| `NEXT_DIST_DIR` | `.next` | Build folder (the app uses `.next-app`, so it never disturbs a dev server) |

## Dependency advisories

`npm audit` flags two issues in the Next 14 tree; both are low-risk for this local tool and the only clean upgrade is Next 16 (a breaking rewrite) — deferred for the MVP:

- **Next.js image-optimization AVIF RCE** — does not apply. This app never uses `next/image`; media is served by `/api/files`. The optimizer endpoint is also disabled via `images.unoptimized` in `next.config.mjs`.
- **postcss sourcemap/XSS** — a build-time dependency only; not reachable at runtime.

If you deploy this beyond your own machine, upgrade to a patched Next major first.
