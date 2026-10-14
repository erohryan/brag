// App settings persisted in <data>/settings.json. Kept small on purpose — the
// Setup page edits these.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './paths.js';

const FILE = path.join(DATA_DIR, 'settings.json');

export const DEFAULT_SETTINGS = {
  model: '', // '' = Claude Code's default model
  maxConcurrent: 1, // videos generated at the same time
  maxBudgetUsd: 0, // per-run spend cap; 0 = no cap
  hyperframesPython: '', // Python 3.10+ with kokoro-onnx for built-in voices
};

export function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  next.maxConcurrent = Math.min(3, Math.max(1, Math.round(Number(next.maxConcurrent) || 1)));
  next.maxBudgetUsd = Math.max(0, Number(next.maxBudgetUsd) || 0);
  next.model = String(next.model || '').trim();
  next.hyperframesPython = String(next.hyperframesPython || '').trim();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, FILE);
  applySettingsEnv(next);
  return next;
}

// Settings that tools read from the environment (Hyperframes' Kokoro TTS).
export function applySettingsEnv(s = getSettings()) {
  if (s.hyperframesPython) process.env.HYPERFRAMES_PYTHON = s.hyperframesPython;
}
