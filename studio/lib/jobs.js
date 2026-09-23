import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, jobDirFor } from './paths.js';
import { getJob, upsertJob } from './store.js';

// Tracks child processes started in this server process.
const running = new Map();

export function isRunning(id) {
  return running.has(id);
}

function appendProgress(dir, kind, text) {
  try {
    fs.appendFileSync(
      path.join(dir, 'progress.jsonl'),
      JSON.stringify({ t: Date.now(), kind, text }) + '\n',
    );
  } catch {
    /* progress is best-effort */
  }
}

export function readProgress(id, limit = 400) {
  const f = path.join(jobDirFor(id), 'progress.jsonl');
  let raw = '';
  try {
    raw = fs.readFileSync(f, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of raw.split('\n').filter(Boolean).slice(-limit)) {
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

function buildPrompt(rec) {
  return [
    `Use the brag-docs skill to turn the document at "input/${rec.filename}" into an informational video.`,
    `This is an automated, non-interactive run. Do NOT ask me any questions — proceed autonomously with these settings:`,
    `- Format: ${rec.format}`,
    `- Tone: ${rec.tone}`,
    `- Narration: ${rec.narration ? 'on (enable voice)' : 'off (no voice)'}; do not ask about narration.`,
    `- Output directory: brag-docs-output`,
    `If the document lacks usable visuals or brand assets, do not wait for input — proceed with a clean neutral look and note it in the plan.`,
    `When finished, make sure brag-docs-output/brag.mp4, brag-docs-output/brag.jpg, and brag-docs-output/share-copy.txt all exist.`,
  ].join('\n');
}

function toolLabel(c) {
  const input = c.input || {};
  switch (c.name) {
    case 'Bash':
      return '⌘ ' + String(input.command || '').split('\n')[0].slice(0, 80);
    case 'Write':
      return '✎ write ' + (input.file_path || '');
    case 'Edit':
      return '✎ edit ' + (input.file_path || '');
    case 'Read':
      return '👁 read ' + (input.file_path || '');
    case 'Skill':
      return '▶ skill: ' + (input.skill || input.command || '');
    default:
      return '→ ' + (c.name || 'tool');
  }
}

function deriveProgress(line) {
  let ev;
  try {
    ev = JSON.parse(line);
  } catch {
    return { kind: 'log', text: line.slice(0, 200) };
  }
  if (!ev || typeof ev !== 'object') return null;
  switch (ev.type) {
    case 'system':
      return ev.subtype === 'init'
        ? { kind: 'system', text: 'Agent session started' }
        : null;
    case 'assistant': {
      const parts = ev.message?.content || [];
      const bits = [];
      for (const c of parts) {
        if (c.type === 'text' && c.text?.trim()) bits.push(c.text.trim());
        else if (c.type === 'tool_use') bits.push(toolLabel(c));
      }
      const text = bits.join('  ·  ').slice(0, 260);
      return text ? { kind: 'step', text } : null;
    }
    case 'result':
      return ev.is_error
        ? { kind: 'error', text: 'Agent run errored' }
        : { kind: 'result', text: 'Agent finished' };
    default:
      return null;
  }
}

function statMtime(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

function parseTitle(md) {
  const m = /^#\s+(.+)$/m.exec(md);
  if (!m) return '';
  return m[1].replace(/^Brag-?Docs Plan:\s*/i, '').trim();
}

function toRel(p) {
  return path.relative(DATA_DIR, p).split(path.sep).join('/');
}

function findOutput(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const outDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith('brag-docs-output'))
    .map((e) => path.join(dir, e.name))
    .sort((a, b) => statMtime(b) - statMtime(a));

  for (const od of outDirs) {
    const mp4 = path.join(od, 'brag.mp4');
    if (!fs.existsSync(mp4)) continue;
    const posterAbs = path.join(od, 'brag.jpg');
    let shareCopy = '';
    try {
      shareCopy = fs.readFileSync(path.join(od, 'share-copy.txt'), 'utf8').trim();
    } catch {
      /* optional */
    }
    let title = '';
    try {
      title = parseTitle(fs.readFileSync(path.join(od, 'brag-plan.md'), 'utf8'));
    } catch {
      /* optional */
    }
    return {
      video: toRel(mp4),
      poster: fs.existsSync(posterAbs) ? toRel(posterAbs) : null,
      shareCopy,
      title,
    };
  }
  return null;
}

function finish(id, patch) {
  const cur = getJob(id);
  if (!cur) return;
  upsertJob({ ...cur, ...patch, finishedAt: Date.now() });
}

export function startJob(rec) {
  const dir = jobDirFor(rec.id);
  fs.mkdirSync(dir, { recursive: true });
  const logFile = path.join(dir, 'claude.log');
  const bin = process.env.BRAG_CLAUDE_BIN || 'claude';
  const args = [
    '-p',
    buildPrompt(rec),
    '--permission-mode',
    'bypassPermissions',
    '--output-format',
    'stream-json',
    '--verbose',
  ];

  appendProgress(dir, 'system', 'Starting brag-docs…');

  let child;
  try {
    child = spawn(bin, args, { cwd: dir, env: process.env });
  } catch (err) {
    appendProgress(dir, 'error', 'Could not launch claude: ' + err.message);
    finish(rec.id, { status: 'failed', error: String(err.message) });
    return;
  }

  running.set(rec.id, child);
  upsertJob({ ...rec, status: 'running', startedAt: Date.now() });

  let buf = '';
  child.stdout.on('data', (chunk) => {
    try {
      fs.appendFileSync(logFile, chunk);
    } catch {
      /* ignore */
    }
    buf += chunk.toString();
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (!line.trim()) continue;
      const p = deriveProgress(line);
      if (p) appendProgress(dir, p.kind, p.text);
    }
  });

  child.stderr.on('data', (chunk) => {
    try {
      fs.appendFileSync(logFile, chunk);
    } catch {
      /* ignore */
    }
  });

  child.on('error', (err) => {
    running.delete(rec.id);
    appendProgress(dir, 'error', 'claude process error: ' + err.message);
    finish(rec.id, { status: 'failed', error: String(err.message) });
  });

  child.on('close', (code) => {
    running.delete(rec.id);
    if (code === 0) {
      const out = findOutput(dir);
      if (out) {
        appendProgress(dir, 'done', 'Video ready ✓');
        finish(rec.id, {
          status: 'done',
          video: out.video,
          poster: out.poster,
          shareCopy: out.shareCopy,
          ...(out.title ? { title: out.title } : {}),
        });
      } else {
        appendProgress(dir, 'error', 'Finished but no video was produced.');
        finish(rec.id, { status: 'failed', error: 'No brag.mp4 found in output.' });
      }
    } else {
      appendProgress(dir, 'error', 'claude exited with code ' + code);
      finish(rec.id, { status: 'failed', error: 'claude exited with code ' + code });
    }
  });
}
