import fs from 'node:fs';
import path from 'node:path';
import { listJobs, upsertJob } from '../../../lib/store.js';
import { startJob } from '../../../lib/jobs.js';
import { jobDirFor } from '../../../lib/paths.js';

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
  const q = new URL(request.url).searchParams.get('q') || '';
  return Response.json({ jobs: listJobs(q) });
}

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const tone = (form.get('tone') || 'polished').toString();
  const format = (form.get('format') || 'landscape').toString();
  const narration = (form.get('narration') || 'off').toString() === 'on';

  const id = makeId();
  const filename = sanitizeName(file.name);
  const dir = jobDirFor(id);
  fs.mkdirSync(path.join(dir, 'input'), { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, 'input', filename), buf);

  const rec = {
    id,
    filename,
    tone,
    format,
    narration,
    status: 'queued',
    createdAt: Date.now(),
    docRel: `jobs/${id}/input/${filename}`,
    title: filename.replace(/\.[^.]+$/, ''),
  };
  upsertJob(rec);

  // Fire-and-forget; progress + result are polled via /api/jobs/[id].
  startJob(rec);

  return Response.json({ id });
}
