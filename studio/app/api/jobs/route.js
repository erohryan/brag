import fs from 'node:fs';
import path from 'node:path';
import { listJobs, upsertJob } from '../../../lib/store.js';
import { startJob } from '../../../lib/jobs.js';
import { jobDirFor } from '../../../lib/paths.js';
import { voiceById, DEFAULT_VOICE, clampSpeed } from '../../../lib/voices.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeName(name) {
  const base = path.basename(String(name || 'document'));
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'document';
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  return Response.json({ jobs: listJobs(params.get('q') || '', params.get('kind') || '') });
}

const MAX_PROMPT = 8000;
const MAX_ASSETS = 10;

function titleFromPrompt(prompt) {
  const line = prompt.split('\n').map((l) => l.trim()).find(Boolean) || 'Idea';
  return line.length > 70 ? line.slice(0, 67).trimEnd() + '…' : line;
}

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const mode = (form.get('mode') || 'document').toString() === 'prompt' ? 'prompt' : 'document';
  const tone = (form.get('tone') || 'polished').toString();
  const format = (form.get('format') || 'landscape').toString();
  const narration = (form.get('narration') || 'off').toString() === 'on';
  const voice = voiceById((form.get('voice') || '').toString())?.id || DEFAULT_VOICE;
  const speed = clampSpeed(form.get('speed'));

  const id = makeId();
  const dir = jobDirFor(id);
  const base = { id, tone, format, narration, voice, speed, status: 'queued', createdAt: Date.now() };
  let rec;

  if (mode === 'prompt') {
    const prompt = (form.get('prompt') || '').toString().trim();
    if (!prompt) return Response.json({ error: 'Write a prompt describing the idea' }, { status: 400 });
    if (prompt.length > MAX_PROMPT) {
      return Response.json({ error: `Prompt is too long (max ${MAX_PROMPT} characters)` }, { status: 400 });
    }
    const assets = form.getAll('assets').filter((f) => f && typeof f !== 'string').slice(0, MAX_ASSETS);

    fs.mkdirSync(path.join(dir, 'input'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'input', 'prompt.md'), prompt + '\n');
    const assetNames = [];
    if (assets.length) {
      fs.mkdirSync(path.join(dir, 'input', 'assets'), { recursive: true });
      for (const a of assets) {
        const name = sanitizeName(a.name);
        fs.writeFileSync(path.join(dir, 'input', 'assets', name), Buffer.from(await a.arrayBuffer()));
        assetNames.push(name);
      }
    }
    rec = {
      ...base,
      kind: 'idea',
      prompt,
      assets: assetNames,
      filename: 'prompt.md',
      docRel: `jobs/${id}/input/prompt.md`,
      title: titleFromPrompt(prompt),
    };
  } else {
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }
    const filename = sanitizeName(file.name);
    fs.mkdirSync(path.join(dir, 'input'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'input', filename), Buffer.from(await file.arrayBuffer()));
    rec = {
      ...base,
      kind: 'docs',
      filename,
      docRel: `jobs/${id}/input/${filename}`,
      title: filename.replace(/\.[^.]+$/, ''),
    };
  }

  upsertJob(rec);

  // Fire-and-forget; progress + result are polled via /api/jobs/[id].
  startJob(rec);

  return Response.json({ id });
}
