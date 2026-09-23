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

function writeAll(list) {
  ensureDirs();
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(list, null, 2));
}

export function listJobs(q) {
  let list = readAll().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
