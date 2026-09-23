import fs from 'node:fs';
import path from 'node:path';

// All runtime data lives under studio/data (gitignored). process.cwd() is the
// studio/ directory when Next runs.
export const DATA_DIR = path.join(process.cwd(), 'data');
export const JOBS_DIR = path.join(DATA_DIR, 'jobs');
export const LIBRARY_FILE = path.join(DATA_DIR, 'library.json');

export function ensureDirs() {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

export function jobDirFor(id) {
  return path.join(JOBS_DIR, id);
}
