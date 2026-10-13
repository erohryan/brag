# brag studio

A local web UI for **`brag-docs`** and **`brag-idea`**: upload a document (PDF, PowerPoint/Keynote, or infographic) or describe an idea in a prompt, watch it become a video, and browse a searchable history of everything you've made.

It's a thin, self-contained Next.js app. When you start a job it runs the matching skill **headlessly** on your machine (via `claude -p`), streams progress into the page, and shows the finished video when the render completes.

## Requirements

Generation happens locally through the agent, so this machine needs everything `brag-docs` needs:

- **Node.js 22+**
- **Claude Code CLI** on `PATH` (`claude`), signed in
- The **`brag`, `brag-docs`, and `brag-idea` skills installed** (globally in `~/.claude/skills/` is easiest — see the repo root README)
- **FFmpeg** on `PATH`
- **Hyperframes CLI** — `npx hyperframes doctor`
- **For narration/voices** — Kokoro TTS runs through Python: **Python 3.10+** with `kokoro-onnx` + `soundfile`:
  ```bash
  # use a Python 3.10+ interpreter (macOS default python3 is often 3.9, which won't work)
  python3.13 -m pip install kokoro-onnx soundfile
  # then point Hyperframes at that interpreter when running studio:
  export HYPERFRAMES_PYTHON="$(which python3.13)"
  ```
  The dashboard shows a banner and the preview buttons report an error if this isn't set up. Without it, videos still generate — just without voiceover.

## Run

```bash
cd studio
npm install
npm run dev      # http://localhost:4321
```

For a production build:

```bash
npm run build && npm start
```

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

## How it works

- **Upload / prompt** → `POST /api/jobs` (`mode=document` with a `file`, or `mode=prompt` with `prompt` + optional `assets`) saves inputs under `data/jobs/<id>/input/` and spawns:
  ```
  claude -p "<brag-docs prompt>" --permission-mode bypassPermissions --output-format stream-json --verbose
  ```
  with the job directory as the working directory.
- **Progress** → the agent's stream-json events are parsed into human-readable steps in `data/jobs/<id>/progress.jsonl`; the job page polls `GET /api/jobs/<id>` to render them live.
- **Result** → on success the app finds `brag-docs-output/brag.mp4` or `brag-idea-output/brag.mp4` (+ poster + share copy) in the job directory and records it in `data/library.json`.
- **Library & search** → `GET /api/jobs?q=&kind=docs|idea` filters the library by title, filename, prompt text, kind, tone, or date.
- **Media** → served by `GET /api/files/[...path]` from `data/` with HTTP range support (video scrubbing).

## Data & privacy

Everything lives under `studio/data/` (gitignored): uploaded documents, per-job logs, rendered videos, and `library.json`. Nothing leaves your machine except the agent's own calls to Claude and Hyperframes during generation. Delete a job by removing its folder under `data/jobs/` and its entry in `data/library.json`.

## Config

| Env var | Default | Purpose |
|---|---|---|
| `BRAG_CLAUDE_BIN` | `claude` | Path to the Claude Code CLI used for headless generation |
| `BRAG_STUDIO_DATA_DIR` | `studio/data` | Where jobs, uploads, renders, and `library.json` live |
| `VOICEBOX_URL` | `http://127.0.0.1:17493` | Local Voicebox server for cloned voices |
| `VOICEBOX_APP` | `/Applications/Voicebox.app` | App launched automatically when Voicebox isn't running |
| `BRAG_HYPERFRAMES_BIN` | `npx hyperframes` | Path to the Hyperframes CLI used for voice-sample synthesis |

## Notes & limits (MVP)

- `--permission-mode bypassPermissions` lets the headless agent run FFmpeg/Hyperframes without prompts. Only run this on documents and a machine you trust.
- **Unfinished renders are recovered.** The agent is told to render in the foreground (a headless `claude -p` run exits — and kills background work — the moment the agent stops), and tools for deferring work are blocked. If it still exits with a built composition but no video, the studio renders `brag.mp4` itself; failed jobs in that state show a **Finish render** button.
- Jobs run in the server process. If you restart the server mid-generation, an in-flight job is orphaned and stays `running` — delete it and re-upload.
- Concurrency is unbounded; each upload spawns its own agent. Uploading many at once will compete for CPU and tokens.

## Dependency advisories

`npm audit` flags two issues in the Next 14 tree; both are low-risk for this local tool and the only clean upgrade is Next 16 (a breaking rewrite) — deferred for the MVP:

- **Next.js image-optimization AVIF RCE** — does not apply. This app never uses `next/image`; media is served by `/api/files`. The optimizer endpoint is also disabled via `images.unoptimized` in `next.config.mjs`.
- **postcss sourcemap/XSS** — a build-time dependency only; not reachable at runtime.

If you deploy this beyond your own machine, upgrade to a patched Next major first.
