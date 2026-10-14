// Locating a job's rendered video and composition, posters, and version snapshots.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './paths.js';
import { OUTPUT_PREFIXES } from './prompts.js';

function statMtime(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

export const toRel = (p) => path.relative(DATA_DIR, p).split(path.sep).join('/');

function parseTitle(md) {
  const m = /^#\s+(.+)$/m.exec(md);
  return m ? m[1].replace(/^Brag-?(Docs|Idea) Plan:\s*/i, '').trim() : '';
}

function outputDirs(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && OUTPUT_PREFIXES.some((p) => e.name.startsWith(p)))
    .map((e) => path.join(dir, e.name))
    .sort((a, b) => statMtime(b) - statMtime(a));
}

// The newest rendered video. `since` (ms) ignores renders older than a task start.
export function findOutput(dir, since = 0) {
  for (const od of outputDirs(dir)) {
    const mp4 = path.join(od, 'brag.mp4');
    if (!fs.existsSync(mp4) || statMtime(mp4) < since) continue;
    const read = (f) => {
      try {
        return fs.readFileSync(path.join(od, f), 'utf8');
      } catch {
        return '';
      }
    };
    const posterAbs = path.join(od, 'brag.jpg');
    return {
      outDir: od,
      video: toRel(mp4),
      poster: fs.existsSync(posterAbs) ? toRel(posterAbs) : null,
      shareCopy: read('share-copy.txt').trim(),
      title: parseTitle(read('brag-plan.md')),
    };
  }
  return null;
}

// Newest output folder with a built composition (composition/index.html).
export function findComposition(dir) {
  return outputDirs(dir).find((od) => fs.existsSync(path.join(od, 'composition', 'index.html'))) || null;
}

export function execp(cmd, args) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args);
    let out = '';
    c.stdout.on('data', (d) => (out += d));
    c.stderr.on('data', (d) => (out += d));
    c.on('error', reject);
    c.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(out.slice(-300)))));
  });
}

export async function posterFrom(mp4, jpg) {
  const secs = parseFloat(await execp('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]));
  const at = Number.isFinite(secs) ? Math.min(secs * 0.15, 8) : 1;
  await execp('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(at), '-i', mp4, '-frames:v', '1', '-q:v', '2', jpg]);
}

// Copy the current video aside before an edit (revoice / revise), so it can be
// restored if the edit fails and kept as a previous version if it succeeds.
export function snapshotVersion(rec, jobDir) {
  const cur = findOutput(jobDir);
  if (!cur) return null;
  const versionsDir = path.join(jobDir, 'versions');
  fs.mkdirSync(versionsDir, { recursive: true });
  const n = (rec.versions?.length || 0) + 1;
  const mp4 = path.join(versionsDir, `v${n}.mp4`);
  fs.copyFileSync(path.join(cur.outDir, 'brag.mp4'), mp4);
  let poster = null;
  if (fs.existsSync(path.join(cur.outDir, 'brag.jpg'))) {
    poster = path.join(versionsDir, `v${n}.jpg`);
    fs.copyFileSync(path.join(cur.outDir, 'brag.jpg'), poster);
  }
  return {
    n,
    label: rec.versionLabel || 'Original',
    video: toRel(mp4),
    poster: poster ? toRel(poster) : null,
    outDir: cur.outDir,
    at: Date.now(),
  };
}

// Put a snapshot back as the current video (after a failed/cancelled edit).
export function restoreVersion(snap) {
  if (!snap) return;
  const abs = (rel) => path.join(DATA_DIR, rel);
  try {
    fs.copyFileSync(abs(snap.video), path.join(snap.outDir, 'brag.mp4'));
    if (snap.poster) fs.copyFileSync(abs(snap.poster), path.join(snap.outDir, 'brag.jpg'));
  } catch {
    /* best-effort */
  }
}
