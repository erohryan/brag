// The job engine: a persistent queue that runs agent tasks through the Claude
// Agent SDK (generate / revoice / revise) and composition renders (finish),
// with cancel, version snapshots, cost tracking, and recovery after a restart.
//
// State lives on globalThis so every Next.js bundle (routes, instrumentation)
// and dev hot-reloads share one queue.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { DATA_DIR, ensureDirs, jobDirFor } from './paths.js';
import { deleteJobRecord, getJob, listJobs, upsertJob } from './store.js';
import { appendProgress, progressFromMessage } from './progress.js';
import { STUDIO_SYSTEM, buildPrompt, buildRevisePrompt, buildRevoicePrompt, kindOf } from './prompts.js';
import { findComposition, findOutput, posterFrom, restoreVersion, snapshotVersion } from './output.js';
import { makePolicyHook } from './policy.js';
import { applySettingsEnv, getSettings } from './settings.js';

const STUDIO_DIR = process.cwd();
// The repo root is a Claude Code plugin ("brag") whose skills/ hold brag,
// brag-docs, brag-idea — loading it keeps jobs on the repo's current skills.
export const PLUGIN_DIR = process.env.BRAG_PLUGIN_DIR || path.resolve(STUDIO_DIR, '..');
export const HYPERFRAMES_BIN = path.join(STUDIO_DIR, 'node_modules', '.bin', 'hyperframes');

const SKILLS = [
  'brag:brag', 'brag:brag-docs', 'brag:brag-idea',
  'hyperframes', 'hyperframes-animation', 'hyperframes-audio', 'hyperframes-cli', 'hyperframes-core',
  'hyperframes-creative', 'hyperframes-keyframes', 'hyperframes-registry', 'hyperframes-studio', 'media-use',
];
// Interactive-only or exfiltration-prone tools.
const DISALLOWED = ['ScheduleWakeup', 'Monitor', 'CronCreate', 'CronDelete', 'RemoteTrigger', 'WebFetch', 'AskUserQuestion', 'PushNotification'];

const G = (globalThis.__bragEngine ??= { queue: [], active: new Map(), booted: false });

export const isRunning = (id) => G.active.has(id);
export const queuePosition = (id) => {
  const i = G.queue.indexOf(id);
  return i < 0 ? null : i + 1;
};

function save(id, patch) {
  const cur = getJob(id);
  if (!cur) return null; // deleted meanwhile
  const next = { ...cur, ...patch };
  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
  return upsertJob(next);
}

const maxConcurrent = () => getSettings().maxConcurrent || 1;

// When jobs live outside the studio folder (the desktop app keeps them in
// Application Support), link the studio's node_modules next to them so the
// agent's `npx hyperframes` resolves the pinned version instead of "latest".
function ensureDataLinks() {
  if (path.resolve(DATA_DIR).startsWith(STUDIO_DIR + path.sep)) return;
  try {
    const nm = path.join(DATA_DIR, 'node_modules');
    if (!fs.existsSync(nm)) fs.symlinkSync(path.join(STUDIO_DIR, 'node_modules'), nm, 'dir');
    const pkg = path.join(DATA_DIR, 'package.json');
    if (!fs.existsSync(pkg)) {
      const hf = JSON.parse(fs.readFileSync(path.join(STUDIO_DIR, 'package.json'), 'utf8')).dependencies?.hyperframes;
      fs.writeFileSync(pkg, JSON.stringify({ name: 'brag-studio-data', private: true, dependencies: { hyperframes: hf } }, null, 2));
    }
  } catch {
    /* falls back to npx resolution */
  }
}

// Called once per server process (instrumentation + lazily from routes).
export function bootEngine() {
  if (G.booted) return;
  G.booted = true;
  applySettingsEnv();
  ensureDirs();
  ensureDataLinks();
  const jobs = listJobs().slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  for (const r of jobs) {
    if (r.status === 'running') {
      // Orphaned by a restart: nothing is running it any more.
      if (r.snapshot) restoreVersion(r.snapshot);
      appendProgress(jobDirFor(r.id), 'error', 'Interrupted — the studio stopped while this was running.');
      save(r.id, {
        status: r.video ? 'done' : 'interrupted',
        resumeTask: r.task,
        task: undefined,
        snapshot: undefined,
        error: r.video ? undefined : 'Interrupted — the studio was closed while this was running.',
        lastError: r.video ? 'The last change was interrupted when the studio closed — the previous video is unchanged.' : undefined,
      });
    } else if (r.status === 'queued' && r.task) {
      G.queue.push(r.id);
    }
  }
  pump();
}

export function enqueue(id, task) {
  bootEngine();
  const rec = getJob(id);
  if (!rec || G.active.has(id) || G.queue.includes(id)) return false;
  save(id, { status: 'queued', task: { ...task, enqueuedAt: Date.now() }, error: undefined, lastError: undefined, resumeTask: undefined });
  G.queue.push(id);
  if (G.active.size >= maxConcurrent()) {
    appendProgress(jobDirFor(id), 'system', 'Queued — another video is being made; this one starts next.');
  }
  pump();
  return true;
}

function pump() {
  while (G.active.size < maxConcurrent() && G.queue.length) {
    const id = G.queue.shift();
    const rec = getJob(id);
    if (!rec?.task || rec.status !== 'queued') continue;
    const ctl = { ac: new AbortController(), cancelled: false, child: null, result: null };
    G.active.set(id, ctl);
    runTask(rec, ctl).finally(() => {
      G.active.delete(id);
      pump();
    });
  }
}

export function cancelJob(id) {
  bootEngine();
  const qi = G.queue.indexOf(id);
  if (qi >= 0) {
    G.queue.splice(qi, 1);
    const cur = getJob(id);
    appendProgress(jobDirFor(id), 'system', 'Cancelled before it started.');
    if (cur) save(id, { status: cur.video ? 'done' : 'cancelled', task: undefined });
    return true;
  }
  const ctl = G.active.get(id);
  if (!ctl) return false;
  ctl.cancelled = true;
  ctl.ac.abort();
  ctl.child?.kill('SIGTERM');
  return true;
}

export function resumeJob(id) {
  const rec = getJob(id);
  if (!rec) return false;
  return enqueue(id, rec.resumeTask || { type: 'generate' });
}

export function deleteJob(id) {
  cancelJob(id);
  deleteJobRecord(id);
  try {
    fs.rmSync(jobDirFor(id), { recursive: true, force: true });
  } catch {
    /* already gone */
  }
}

function taskLabel(task, rec) {
  switch (task.type) {
    case 'revoice':
      return `Voice → ${task.voice?.name || task.voice?.id}`;
    case 'revise':
      return `Revision: ${String(task.feedback).replace(/\s+/g, ' ').slice(0, 70)}`;
    case 'finish':
      return rec.versionLabel || 'Original';
    default:
      return 'Original';
  }
}

function startMessage(rec, task) {
  switch (task.type) {
    case 'revoice':
      return `Rebuilding with voice ${task.voice?.name || task.voice?.id}…`;
    case 'revise':
      return `Revising: “${String(task.feedback).replace(/\s+/g, ' ').slice(0, 90)}”`;
    default:
      return `Starting ${kindOf(rec).skill.replace(/^brag:/, '')}…`;
  }
}

function costPatch(cur, result) {
  if (!result || typeof result.total_cost_usd !== 'number') return {};
  return {
    costUsd: Math.round(((cur.costUsd || 0) + result.total_cost_usd) * 10000) / 10000,
    lastRun: { costUsd: result.total_cost_usd, turns: result.num_turns, durationMs: result.duration_ms },
  };
}

class Cancelled extends Error {}

async function runTask(rec, ctl) {
  const dir = jobDirFor(rec.id);
  const task = rec.task;
  const startedAt = Date.now();
  let snap = null;
  try {
    if (task.type === 'revoice' || task.type === 'revise') snap = snapshotVersion(rec, dir);
    rec = save(rec.id, {
      status: 'running',
      startedAt,
      snapshot: snap || undefined,
      ...(task.type === 'revoice'
        ? { voice: task.voice.id, voiceName: task.voice.name, narration: true, ...(task.speed ? { speed: task.speed } : {}) }
        : {}),
    });
    if (!rec) return; // deleted

    if (task.type === 'finish') await renderComposition(dir, ctl);
    else await runAgent(rec, task, ctl, dir);
    if (ctl.cancelled) throw new Cancelled();

    let out = findOutput(dir, startedAt);
    if (!out && task.type !== 'finish' && findComposition(dir)) {
      appendProgress(dir, 'system', 'The agent stopped before the final render finished — rendering it now.', { stage: 'render' });
      await renderComposition(dir, ctl);
      if (ctl.cancelled) throw new Cancelled();
      out = findOutput(dir, startedAt);
    }
    if (!out) {
      const r = ctl.result;
      throw new Error(r && (r.is_error || r.subtype !== 'success') ? `The agent run ended early (${r.subtype}).` : 'No video was produced.');
    }
    if (!out.poster) {
      await posterFrom(path.join(out.outDir, 'brag.mp4'), path.join(out.outDir, 'brag.jpg')).catch(() => {});
      out = findOutput(dir, startedAt) || out;
    }

    const cur = getJob(rec.id);
    if (!cur) return;
    const versions = [...(cur.versions || [])];
    if (snap) versions.push({ n: snap.n, label: snap.label, video: snap.video, poster: snap.poster, at: snap.at });
    appendProgress(dir, 'done', 'Video ready ✓');
    save(rec.id, {
      status: 'done',
      video: out.video,
      poster: out.poster,
      shareCopy: out.shareCopy,
      ...(out.title && task.type === 'generate' ? { title: out.title } : {}),
      versions,
      versionLabel: taskLabel(task, cur),
      snapshot: undefined,
      task: undefined,
      error: undefined,
      lastError: undefined,
      finishedAt: Date.now(),
      ...costPatch(cur, ctl.result),
    });
  } catch (err) {
    const cur = getJob(rec.id);
    if (snap) {
      restoreVersion(snap);
      for (const f of [snap.video, snap.poster]) if (f) fs.rmSync(path.join(DATA_DIR, f), { force: true });
    }
    if (!cur) return;
    const cancelled = ctl.cancelled || err instanceof Cancelled;
    const msg = String(err?.message || err).slice(0, 300);
    if (cancelled) appendProgress(dir, 'system', 'Cancelled.');
    else appendProgress(dir, 'error', msg);
    save(rec.id, {
      status: cur.video ? 'done' : cancelled ? 'cancelled' : 'failed',
      error: cur.video || cancelled ? undefined : msg,
      lastError: cur.video && !cancelled ? `Your last change didn't go through (${msg}) — the previous video is unchanged.` : undefined,
      resumeTask: cancelled || cur.video ? undefined : task,
      task: undefined,
      snapshot: undefined,
      finishedAt: Date.now(),
      ...costPatch(cur, ctl.result),
    });
  }
}

async function runAgent(rec, task, ctl, dir) {
  const prompt =
    task.type === 'revoice'
      ? buildRevoicePrompt(rec, task.voice.id, rec.speed)
      : task.type === 'revise'
        ? buildRevisePrompt(rec, task.feedback)
        : buildPrompt(rec);
  appendProgress(dir, 'system', startMessage(rec, task));
  const logFile = path.join(dir, 'claude.log');
  const onDeny = (tool, reason) => appendProgress(dir, 'policy', `Blocked ${tool}: ${reason}`);
  const stream = await agentStream({ prompt, dir, ctl, onDeny });
  for await (const m of stream) {
    try {
      fs.appendFileSync(logFile, JSON.stringify(m) + '\n');
    } catch {
      /* best-effort */
    }
    const p = progressFromMessage(m);
    if (p) appendProgress(dir, p.kind, p.text, p.extra);
    if (m.type === 'result') ctl.result = m;
  }
}

async function agentStream({ prompt, dir, ctl, onDeny }) {
  const policy = makePolicyHook(dir, onDeny);
  // Test seam: a module whose default export yields SDK-shaped messages.
  if (process.env.BRAG_AGENT_STUB) {
    const mod = await import(/* webpackIgnore: true */ pathToFileURL(process.env.BRAG_AGENT_STUB).href);
    return mod.default({ prompt, cwd: dir, signal: ctl.ac.signal, policy });
  }
  const s = getSettings();
  return query({
    prompt,
    options: {
      cwd: dir,
      abortController: ctl.ac,
      plugins: [{ type: 'local', path: PLUGIN_DIR, skipMcpDiscovery: true }],
      skills: SKILLS,
      // Unattended: nothing may stop to ask. Safety comes from the policy hook,
      // which runs on every tool call regardless of permission mode.
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      disallowedTools: DISALLOWED,
      hooks: { PreToolUse: [{ hooks: [policy] }] },
      systemPrompt: { type: 'preset', preset: 'claude_code', append: STUDIO_SYSTEM },
      env: { ...process.env },
      ...(s.model ? { model: s.model } : {}),
      ...(s.maxBudgetUsd > 0 ? { maxBudgetUsd: s.maxBudgetUsd } : {}),
      stderr: (d) => {
        try {
          fs.appendFileSync(path.join(dir, 'claude.stderr.log'), d);
        } catch {
          /* best-effort */
        }
      },
    },
  });
}

// Render a built composition with the studio's pinned Hyperframes.
function renderComposition(dir, ctl) {
  return new Promise((resolve, reject) => {
    const outDir = findComposition(dir);
    if (!outDir) return reject(new Error('There is no built composition to render.'));
    const mp4 = path.join(outDir, 'brag.mp4');
    appendProgress(dir, 'system', 'Rendering the finished composition (high quality)…', { stage: 'render' });
    const pinned = fs.existsSync(HYPERFRAMES_BIN);
    const child = spawn(
      pinned ? HYPERFRAMES_BIN : 'npx',
      [...(pinned ? [] : ['--yes', 'hyperframes']), 'render', '--quality', 'high', '--output', mp4],
      { cwd: path.join(outDir, 'composition'), env: process.env },
    );
    ctl.child = child;
    let lastPct = -1;
    let tail = '';
    const onData = (chunk) => {
      const text = chunk.toString();
      tail = (tail + text).slice(-3000);
      try {
        fs.appendFileSync(path.join(outDir, 'render.log'), text);
      } catch {
        /* best-effort */
      }
      const m = [...text.matchAll(/(\d{1,3})%/g)].pop();
      if (m) {
        const pct = Number(m[1]);
        if (pct >= lastPct + 10 || (pct === 100 && lastPct !== 100)) {
          lastPct = pct;
          appendProgress(dir, 'step', `Rendering… ${pct}%`, { stage: 'render', pct });
        }
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
    child.on('close', async (code) => {
      ctl.child = null;
      if (ctl.cancelled) return resolve();
      if (code !== 0 || !fs.existsSync(mp4)) {
        const why = tail.replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 200);
        return reject(new Error(`The final render failed: ${why}`));
      }
      const jpg = path.join(outDir, 'brag.jpg');
      if (!fs.existsSync(jpg)) await posterFrom(mp4, jpg).catch(() => {});
      resolve();
    });
  });
}
