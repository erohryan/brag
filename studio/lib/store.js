import fs from 'node:fs';
import { LIBRARY_FILE, ensureDirs } from './paths.js';

// Simple JSON-file library. Single-user, single-process local tool — a flat
// file is plenty and keeps the app dependency-free.

function readAll() {
  ensureDirs();
  try {
    const data = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Atomic: write a temp file then rename, so a crash mid-write can't corrupt
// the library. (Writes are synchronous, so one server process never interleaves.)
function writeAll(list) {
  ensureDirs();
  const tmp = `${LIBRARY_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, LIBRARY_FILE);
}

// Jobs created before kinds existed are document jobs.
export function kindOf(rec) {
  return rec.kind === 'idea' ? 'idea' : 'docs';
}

export function listJobs(q, kind) {
  let list = readAll().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (kind === 'docs' || kind === 'idea') list = list.filter((r) => kindOf(r) === kind);
  const needle = (q || '').trim().toLowerCase();
  if (needle) {
    list = list.filter((r) =>
      [
        r.title,
        r.filename,
        r.tone,
        r.format,
        r.status,
        r.shareCopy,
        r.prompt,
        r.kind === 'idea' ? 'idea prompt' : 'document',
        new Date(r.createdAt || 0).toLocaleDateString(),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }
  return list;
}

export function getJob(id) {
  return readAll().find((r) => r.id === id) || null;
}

export function upsertJob(rec) {
  const list = readAll();
  const i = list.findIndex((r) => r.id === rec.id);
  if (i >= 0) list[i] = rec;
  else list.push(rec);
  writeAll(list);
  return rec;
}

export function deleteJobRecord(id) {
  writeAll(readAll().filter((r) => r.id !== id));
}
