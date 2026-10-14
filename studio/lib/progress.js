// Per-job progress log (progress.jsonl) — what the UI's progress card and
// "Show log" read.
import fs from 'node:fs';
import path from 'node:path';
import { jobDirFor } from './paths.js';
import { laterStage, stageOfTool } from './stages.js';

// `extra` carries structured fields for the progress bar ({ stage, pct }).
export function appendProgress(dir, kind, text, extra) {
  try {
    fs.appendFileSync(path.join(dir, 'progress.jsonl'), JSON.stringify({ t: Date.now(), kind, text, ...extra }) + '\n');
  } catch {
    /* progress is best-effort */
  }
}

export function readProgress(id, limit = 600) {
  let raw = '';
  try {
    raw = fs.readFileSync(path.join(jobDirFor(id), 'progress.jsonl'), 'utf8');
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

// Paths relative to the job folder, so log lines show what matters.
function shortPath(p) {
  const s = String(p || '');
  const m = /\/jobs\/[^/]+\/(.*)$/.exec(s);
  return m ? m[1] : s.replace(/^\/Users\/[^/]+\//, '~/');
}

function shortCmd(cmd) {
  return String(cmd || '')
    .split('\n')[0]
    .replace(/^\s*cd\s+\S+\s*(&&|;)\s*/, '')
    .replace(/\/Users\/[^\s'"]*\/jobs\/[^/\s'"]+\//g, '')
    .replace(/\/Users\/[^/\s'"]+\//g, '~/')
    .slice(0, 110);
}

function toolLabel(c) {
  const input = c.input || {};
  switch (c.name) {
    case 'Bash':
      return '⌘ ' + shortCmd(input.command);
    case 'Write':
      return '✎ write ' + shortPath(input.file_path);
    case 'Edit':
      return '✎ edit ' + shortPath(input.file_path);
    case 'Read':
      return '👁 read ' + shortPath(input.file_path);
    case 'Skill':
      return '▶ skill: ' + (input.skill || input.command || '');
    default:
      return '→ ' + (c.name || 'tool');
  }
}

// Turn one Agent SDK message into a progress entry (or null to skip).
export function progressFromMessage(m) {
  if (!m || typeof m !== 'object') return null;
  switch (m.type) {
    case 'system':
      return m.subtype === 'init' ? { kind: 'system', text: 'Agent session started' } : null;
    case 'assistant': {
      const bits = [];
      let stage = null;
      for (const c of m.message?.content || []) {
        if (c.type === 'text' && c.text?.trim()) bits.push(c.text.trim());
        else if (c.type === 'tool_use') {
          bits.push(toolLabel(c));
          stage = laterStage(stage, stageOfTool(c.name, c.input));
        }
      }
      const text = bits.join('  ·  ').slice(0, 260);
      return text ? { kind: 'step', text, extra: stage ? { stage } : undefined } : null;
    }
    case 'result':
      return m.is_error || m.subtype !== 'success'
        ? { kind: 'error', text: `Agent run ended: ${m.subtype}${m.errors?.length ? ` — ${String(m.errors[0]).slice(0, 160)}` : ''}` }
        : { kind: 'result', text: 'Agent finished' };
    default:
      return null;
  }
}
