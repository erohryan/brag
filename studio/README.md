# brag studio

A local web UI for **`brag-docs`**: upload a document (PDF, PowerPoint/Keynote, or infographic), watch it become an informational video, and browse a searchable history of everything you've made.

It's a thin, self-contained Next.js app. When you upload a document it runs the `brag-docs` skill **headlessly** on your machine (via `claude -p`), streams progress into the page, and shows the finished video when the render completes.

## Requirements

Generation happens locally through the agent, so this machine needs everything `brag-docs` needs:

- **Node.js 22+**
- **Claude Code CLI** on `PATH` (`claude`), signed in
- The **`brag` and `brag-docs` skills installed** (globally in `~/.claude/skills/` is easiest — see the repo root README)
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

## Narration voices

Narration uses **Kokoro-82M** locally via `hyperframes tts` — 12 voices are surfaced in the UI (Heart, Nova, Sky, Adam, Michael, Emma, Isabella, George, plus Spanish/French/Japanese/Chinese voices).

- **Trial any voice** — the "Try the narration voices" section on the dashboard plays a spoken sample for each. Samples are synthesized once and cached under `data/voice-samples/`. (The very first sample triggers a one-time Kokoro model download, so it can take a bit; after that they're instant.)
- **Pick a voice for a new video** — turn narration on in the upload form and choose a voice (with an inline preview) before generating.
- **Swap the voice on an existing video** — open any finished video and use the **Voice** panel to pick a different voice and *Rebuild with this voice*. The rebuild keeps the same visuals, structure, and script — it only regenerates the voiceover, re-times to the new audio, and re-renders. If the original had no narration, rebuilding adds it.

## How it works

- **Upload** → `POST /api/jobs` saves the file under `data/jobs/<id>/input/` and spawns:
  ```
  claude -p "<brag-docs prompt>" --permission-mode bypassPermissions --output-format stream-json --verbose
  ```
  with the job directory as the working directory.
- **Progress** → the agent's stream-json events are parsed into human-readable steps in `data/jobs/<id>/progress.jsonl`; the job page polls `GET /api/jobs/<id>` to render them live.
- **Result** → on success the app finds `brag-docs-output/brag.mp4` (+ poster + share copy) in the job directory and records it in `data/library.json`.
- **Library & search** → `GET /api/jobs?q=` filters the library by title, filename, tone, or date.
- **Media** → served by `GET /api/files/[...path]` from `data/` with HTTP range support (video scrubbing).

## Data & privacy

Everything lives under `studio/data/` (gitignored): uploaded documents, per-job logs, rendered videos, and `library.json`. Nothing leaves your machine except the agent's own calls to Claude and Hyperframes during generation. Delete a job by removing its folder under `data/jobs/` and its entry in `data/library.json`.

## Config

| Env var | Default | Purpose |
|---|---|---|
| `BRAG_CLAUDE_BIN` | `claude` | Path to the Claude Code CLI used for headless generation |
| `BRAG_HYPERFRAMES_BIN` | `npx hyperframes` | Path to the Hyperframes CLI used for voice-sample synthesis |

## Notes & limits (MVP)

- `--permission-mode bypassPermissions` lets the headless agent run FFmpeg/Hyperframes without prompts. Only run this on documents and a machine you trust.
- Jobs run in the server process. If you restart the server mid-generation, an in-flight job is orphaned and stays `running` — delete it and re-upload.
- Concurrency is unbounded; each upload spawns its own agent. Uploading many at once will compete for CPU and tokens.

## Dependency advisories

`npm audit` flags two issues in the Next 14 tree; both are low-risk for this local tool and the only clean upgrade is Next 16 (a breaking rewrite) — deferred for the MVP:

- **Next.js image-optimization AVIF RCE** — does not apply. This app never uses `next/image`; media is served by `/api/files`. The optimizer endpoint is also disabled via `images.unoptimized` in `next.config.mjs`.
- **postcss sourcemap/XSS** — a build-time dependency only; not reachable at runtime.

If you deploy this beyond your own machine, upgrade to a patched Next major first.
