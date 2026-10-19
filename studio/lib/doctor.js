// Setup checks ("Doctor"): everything the studio needs on this machine, with
// one-click fixes where possible. Fixes run in the background with a log the
// Setup page polls.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { DATA_DIR } from './paths.js';
import { HYPERFRAMES_BIN, PLUGIN_DIR } from './engine.js';
import { checkTts } from './tts.js';
import { getSettings, saveSettings } from './settings.js';
import { VOICEBOX_URL, ensureVoicebox, queueStalled, restartVoicebox, voiceboxHealth } from './voicebox.mjs';

const G = (globalThis.__bragDoctor ??= { cache: {}, fixes: {} });
const VOICEBOX_MODEL = 'qwen-tts-1.7B';
const KOKORO_VENV = path.join(os.homedir(), '.brag-studio', 'kokoro-venv');

function run(cmd, args, { timeout = 60000, onLine } = {}) {
  return new Promise((resolve) => {
    let out = '';
    let child;
    try {
      child = spawn(cmd, args, { env: process.env });
    } catch (err) {
      resolve({ code: -1, out: err.message });
      return;
    }
    const t = setTimeout(() => child.kill('SIGTERM'), timeout);
    const onData = (d) => {
      const s = d.toString();
      out += s;
      if (onLine) for (const l of s.split(/\r?\n/)) if (l.trim()) onLine(l.replace(/\x1b\[[0-9;]*m/g, '').trim());
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (err) => {
      clearTimeout(t);
      resolve({ code: -1, out: err.message });
    });
    child.on('close', (code) => {
      clearTimeout(t);
      resolve({ code, out });
    });
  });
}

async function cached(key, ttlMs, fn) {
  const hit = G.cache[key];
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await fn();
  G.cache[key] = { at: Date.now(), value };
  return value;
}

// Is Claude Code signed in? Starts an SDK session without sending a prompt.
async function claudeAccount() {
  const ac = new AbortController();
  const idle = { async *[Symbol.asyncIterator]() { await new Promise((r) => ac.signal.addEventListener('abort', r)); } };
  const q = query({ prompt: idle, options: { abortController: ac, cwd: os.tmpdir() } });
  try {
    const info = await Promise.race([q.accountInfo(), new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), 25000))]);
    return { ok: !!(info?.email || info?.apiKeySource || info?.apiProvider), info };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    ac.abort();
    try {
      q.close?.();
    } catch {
      /* already closed */
    }
  }
}

async function hyperframesDoctor() {
  if (!fs.existsSync(HYPERFRAMES_BIN)) return null;
  const { out } = await run(HYPERFRAMES_BIN, ['doctor', '--json'], { timeout: 60000 });
  try {
    return JSON.parse(out.slice(out.indexOf('{')));
  } catch {
    return null;
  }
}

const check = (id, label, status, detail, extra = {}) => ({ id, label, status, detail, ...extra });

export async function runChecks({ quick = false } = {}) {
  const checks = [];

  const major = Number(process.versions.node.split('.')[0]);
  checks.push(major >= 22 ? check('node', 'Node.js', 'ok', `v${process.versions.node}`) : check('node', 'Node.js', 'fail', `v${process.versions.node} — 22 or newer is required.`));

  const acct = quick ? G.cache.claude?.value : await cached('claude', 5 * 60000, claudeAccount);
  if (acct) {
    checks.push(
      acct.ok
        ? check('claude', 'Claude sign-in', 'ok', acct.info?.email ? `${acct.info.email}${acct.info.subscriptionType ? ` · ${acct.info.subscriptionType}` : ''}` : `Using ${acct.info?.apiKeySource || acct.info?.apiProvider || 'configured credentials'}`)
        : check('claude', 'Claude sign-in', 'fail', 'Not signed in. Open Terminal, run `claude`, and log in (or set ANTHROPIC_API_KEY).', { hint: acct.error }),
    );
  }

  const skillsOk = ['brag', 'brag-docs', 'brag-idea'].every((s) => fs.existsSync(path.join(PLUGIN_DIR, 'skills', s, 'SKILL.md')));
  checks.push(skillsOk ? check('skills', 'brag skills', 'ok', `Loaded from ${PLUGIN_DIR.replace(os.homedir(), '~')}`) : check('skills', 'brag skills', 'fail', `Missing from ${PLUGIN_DIR} — the studio must run from inside the brag repo (or set BRAG_PLUGIN_DIR).`));

  const hfSkills = fs.existsSync(path.join(os.homedir(), '.claude', 'skills', 'hyperframes-core', 'SKILL.md'));
  checks.push(hfSkills ? check('hf-skills', 'Hyperframes skills', 'ok', 'Installed for Claude Code') : check('hf-skills', 'Hyperframes skills', 'fail', 'Not installed — the agent needs them to build compositions.', { fix: 'install-hf-skills', fixLabel: 'Install' }));

  const hf = quick ? G.cache.hf?.value : await cached('hf', 2 * 60000, hyperframesDoctor);
  if (!fs.existsSync(HYPERFRAMES_BIN)) {
    checks.push(check('hyperframes', 'Hyperframes (renderer)', 'fail', 'Not installed. Run `npm install` in the studio folder.'));
  } else if (hf) {
    const find = (n) => hf.checks?.find((c) => c.name === n);
    const version = find('Version')?.detail?.split(' ')[0] || '?';
    checks.push(check('hyperframes', 'Hyperframes (renderer)', 'ok', `${version} (pinned)`));
    for (const [name, id, label] of [['FFmpeg', 'ffmpeg', 'FFmpeg'], ['FFprobe', 'ffprobe', 'FFprobe'], ['Chrome', 'chrome', 'Chrome for rendering']]) {
      const c = find(name);
      if (!c) continue;
      checks.push(
        c.ok
          ? check(id, label, 'ok', c.detail.replace(os.homedir(), '~').slice(0, 90))
          : check(id, label, 'fail', c.detail || 'Missing', id === 'chrome' ? { fix: 'install-chrome', fixLabel: 'Install' } : { hint: 'Install with: brew install ffmpeg' }),
      );
    }
  }

  const tts = await checkTts();
  checks.push(tts.ok ? check('kokoro', 'Built-in voices (Kokoro)', 'ok', `Python: ${tts.python.replace(os.homedir(), '~')}`) : check('kokoro', 'Built-in voices (Kokoro)', 'warn', 'Not set up — narration with built-in voices is unavailable.', { fix: 'setup-kokoro', fixLabel: 'Set up', optional: true }));

  const vb = await voiceboxHealth();
  if (!vb.installed) {
    checks.push(check('voicebox', 'Cloned voices (Voicebox)', 'warn', 'Voicebox is not installed (optional).', { link: 'https://github.com/jamiepine/voicebox/releases', linkLabel: 'Download', optional: true }));
  } else if (!vb.running) {
    checks.push(check('voicebox', 'Cloned voices (Voicebox)', 'ok', 'Installed — starts automatically when a cloned voice is used.', { fix: 'start-voicebox', fixLabel: 'Start now', optional: true }));
  } else {
    let model = null;
    try {
      const st = await (await fetch(`${VOICEBOX_URL}/models/status`, { cache: 'no-store' })).json();
      model = (st.models || []).find((m) => m.model_name === VOICEBOX_MODEL);
    } catch {
      /* ignore */
    }
    const stuck = model?.downloaded && (await queueStalled());
    checks.push(
      stuck
        ? check('voicebox', 'Cloned voices (Voicebox)', 'fail', 'Voicebox is stuck on a clip and everything behind it is waiting. Restarting it clears the jam.', { fix: 'restart-voicebox', fixLabel: 'Restart Voicebox' })
        : model?.downloaded
        ? check('voicebox', 'Cloned voices (Voicebox)', 'ok', `Running · ${VOICEBOX_MODEL} ready`)
        : check('voicebox', 'Cloned voices (Voicebox)', 'warn', `Running, but the ${VOICEBOX_MODEL} voice model (~4.3 GB) isn't downloaded.`, { fix: 'voicebox-model', fixLabel: 'Download model', optional: true }),
    );
  }

  try {
    const st = fs.statfsSync(DATA_DIR);
    const gb = (st.bavail * st.bsize) / 1e9;
    checks.push(gb >= 5 ? check('disk', 'Disk space', 'ok', `${gb.toFixed(0)} GB free`) : check('disk', 'Disk space', 'warn', `Only ${gb.toFixed(1)} GB free — renders and models need room.`));
  } catch {
    /* statfs unavailable */
  }

  const summary = checks.some((c) => c.status === 'fail') ? 'fail' : checks.some((c) => c.status === 'warn' && !c.optional) ? 'warn' : 'ok';
  return { summary, checks, fixes: G.fixes, settings: getSettings() };
}

// ---- Fixes ---------------------------------------------------------------

function findPython310() {
  const cands = ['python3.13', 'python3.12', 'python3.11', 'python3.10']
    .flatMap((n) => [`/opt/homebrew/bin/${n}`, `/usr/local/bin/${n}`, n])
    .concat(['/opt/homebrew/bin/python3', '/usr/local/bin/python3']);
  return cands;
}

const FIXES = {
  async 'install-hf-skills'(log) {
    const { code } = await run(HYPERFRAMES_BIN, ['skills'], { timeout: 300000, onLine: log });
    if (code !== 0) throw new Error('hyperframes skills failed');
  },
  async 'install-chrome'(log) {
    const { code } = await run(HYPERFRAMES_BIN, ['browser', 'ensure'], { timeout: 600000, onLine: log });
    if (code !== 0) throw new Error('Could not install Chrome for rendering');
  },
  async 'setup-kokoro'(log) {
    let python = null;
    for (const p of findPython310()) {
      const { code, out } = await run(p, ['-c', 'import sys; print(sys.version_info[:2] >= (3,10))'], { timeout: 10000 });
      if (code === 0 && out.trim() === 'True') {
        python = p;
        break;
      }
    }
    if (!python) throw new Error('No Python 3.10+ found. Install one with `brew install python@3.13`, then try again.');
    log(`Using ${python}`);
    fs.mkdirSync(path.dirname(KOKORO_VENV), { recursive: true });
    if (!fs.existsSync(path.join(KOKORO_VENV, 'bin', 'python'))) {
      const v = await run(python, ['-m', 'venv', KOKORO_VENV], { timeout: 120000, onLine: log });
      if (v.code !== 0) throw new Error('Could not create the Python environment');
    }
    const pip = path.join(KOKORO_VENV, 'bin', 'pip');
    log('Installing kokoro-onnx and soundfile (this can take a few minutes)…');
    const i = await run(pip, ['install', '--quiet', 'kokoro-onnx', 'soundfile'], { timeout: 900000, onLine: log });
    if (i.code !== 0) throw new Error('pip install failed');
    saveSettings({ hyperframesPython: path.join(KOKORO_VENV, 'bin', 'python') });
    log('Built-in voices are ready.');
  },
  async 'start-voicebox'(log) {
    log('Starting Voicebox…');
    await ensureVoicebox();
    log('Voicebox is running.');
  },
  async 'restart-voicebox'(log) {
    log('Restarting Voicebox…');
    await restartVoicebox('setup page', { force: true });
    log('Voicebox restarted.');
  },
  async 'voicebox-model'(log) {
    await ensureVoicebox();
    await fetch(`${VOICEBOX_URL}/models/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: VOICEBOX_MODEL }),
    });
    log(`Downloading ${VOICEBOX_MODEL}…`);
    for (let i = 0; i < 720; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const st = await (await fetch(`${VOICEBOX_URL}/models/status`, { cache: 'no-store' })).json();
      const m = (st.models || []).find((x) => x.model_name === VOICEBOX_MODEL);
      if (m?.downloaded) {
        log('Model downloaded.');
        return;
      }
      if (i % 6 === 0) log(m?.downloading ? 'Still downloading…' : 'Waiting for the download to start…');
    }
    throw new Error('The download did not finish within an hour.');
  },
};

export function startFix(id) {
  const fn = FIXES[id];
  if (!fn) return { error: 'Unknown fix' };
  if (G.fixes[id]?.state === 'running') return { ok: true };
  const entry = { state: 'running', log: [], startedAt: Date.now() };
  G.fixes[id] = entry;
  const log = (line) => {
    entry.log.push(line);
    if (entry.log.length > 200) entry.log.shift();
  };
  fn(log)
    .then(() => {
      entry.state = 'done';
      G.cache = {}; // re-check everything
    })
    .catch((err) => {
      entry.state = 'failed';
      log(err.message);
    });
  return { ok: true };
}
