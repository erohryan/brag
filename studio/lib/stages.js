// Pipeline stages for a job's progress bar. Shared by the server (which tags
// log entries with a stage as the agent works) and the browser (which turns
// the tagged log into a progress bar). The agent reports no percentages, so
// progress = finished stages by weight + a time-based creep inside the current
// stage (or the real render %, when the studio renders).

export const STAGES = [
  { key: 'start', label: 'Starting up', weight: 3, tau: 15 },
  { key: 'read', label: 'Reading the document', ideaLabel: 'Understanding the idea', weight: 10, tau: 45 },
  { key: 'plan', label: 'Planning the video', weight: 12, tau: 60 },
  { key: 'voice', label: 'Recording narration', weight: 14, tau: 90, needsNarration: true },
  { key: 'compose', label: 'Building the animation', weight: 28, tau: 150 },
  { key: 'check', label: 'Checking the result', weight: 10, tau: 90 },
  { key: 'render', label: 'Rendering the video', weight: 18, tau: 90 },
  { key: 'finish', label: 'Finishing touches', weight: 5, tau: 20 },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);

const isWrite = (name) => name === 'Write' || name === 'Edit';

// Classify one agent tool call from its full input (server side).
export function stageOfTool(name, input = {}) {
  const cmd = String(input.command || '');
  const file = String(input.file_path || input.path || '');
  if (name === 'Skill') return 'read';
  if (/hyperframes\s+render\b/.test(cmd)) return 'render';
  if (/hyperframes\s+(check|snapshot|lint|validate|inspect)\b/.test(cmd)) return 'check';
  if (/hyperframes\s+tts\b|bin\/tts\.mjs/.test(cmd)) return 'voice';
  if (isWrite(name) && /brag-plan\.md$/.test(file)) return 'plan';
  if (/>\s*\S*brag-plan\.md/.test(cmd)) return 'plan';
  if (isWrite(name) && /\/composition\/|composition-brief|index\.template|build\.py/.test(file)) return 'compose';
  if (/composition\/(index\.html|build\.py)|>\s*\S*composition\/|index\.template/.test(cmd)) return 'compose';
  if (/brag\.jpg|poster/.test(cmd)) return 'finish';
  if (name === 'Read' && /\/input\//.test(file)) return 'read';
  return null;
}

export function laterStage(a, b) {
  if (!a) return b;
  if (!b) return a;
  return STAGE_KEYS.indexOf(b) > STAGE_KEYS.indexOf(a) ? b : a;
}

// Best-effort guess for log entries written before stages were recorded.
function guessStage(e) {
  const t = e.text || '';
  if (/^Rendering… \d+%|^Rendering the finished composition/.test(t)) return 'render';
  if (/^▶ skill:/.test(t)) return 'read';
  if (/hyperframes render/.test(t)) return 'render';
  if (/hyperframes (check|snapshot)/.test(t)) return 'check';
  if (/hyperframes tts|tts\.mjs|^voicebox:/.test(t)) return 'voice';
  if (/^✎ .*brag-plan\.md/.test(t)) return 'plan';
  if (/^✎ .*(composition|index\.template|build\.py)/.test(t)) return 'compose';
  return null;
}

const RUN_START = /^(Starting |Rebuilding with voice|Rendering the finished composition)/;
const TOOL_LINE = /^[⌘✎👁▶→]/u;

export function computeProgress(job, now = Date.now()) {
  const progress = job.progress || [];
  // Only the latest run counts (a rebuild or finish-render appends a new one).
  let start = 0;
  for (let i = progress.length - 1; i >= 0; i--) {
    if (progress[i].kind === 'system' && RUN_START.test(progress[i].text || '')) {
      start = i;
      break;
    }
  }
  const run = progress.slice(start);
  const first = run[0]?.text || '';

  const stages = STAGES.filter((s) => !s.needsNarration || job.narration).map((s) => ({
    ...s,
    label: job.kind === 'idea' && s.ideaLabel ? s.ideaLabel : s.label,
  }));
  const idx = (k) => stages.findIndex((s) => s.key === k);

  let cur = 0;
  if (/^Rebuilding with voice/.test(first)) cur = Math.max(0, idx('voice'));
  if (/^Rendering the finished composition/.test(first)) cur = idx('render');
  const startedAt = run[0]?.t ?? job.startedAt ?? now;
  let enteredAt = startedAt;
  let renderPct = null;
  let activity = '';

  for (const e of run) {
    let k = e.stage || guessStage(e);
    if (!k && e.kind === 'step' && cur === 0) k = 'read'; // any agent activity ⇒ past start-up
    if (k) {
      const i = idx(k);
      if (i > cur) {
        cur = i;
        enteredAt = e.t ?? enteredAt;
      }
    }
    if (e.pct != null) renderPct = e.pct;
    const m = /^Rendering… (\d+)%/.exec(e.text || '');
    if (m) renderPct = Number(m[1]);
    else if (e.kind === 'step' && !TOOL_LINE.test(e.text || '')) activity = e.text;
  }

  const elapsed = Math.max(0, (job.status === 'running' || job.status === 'queued' ? now : run[run.length - 1]?.t ?? now) - startedAt);
  if (job.status === 'done') {
    return { pct: 100, stageIndex: stages.length, stages, label: 'Video ready', activity, elapsed };
  }

  const total = stages.reduce((a, s) => a + s.weight, 0);
  const base = stages.slice(0, cur).reduce((a, s) => a + s.weight, 0);
  const stage = stages[cur];
  let frac = 0;
  if (job.status !== 'failed') {
    frac =
      stage.key === 'render' && renderPct != null
        ? Math.min(renderPct / 100, 0.98)
        : Math.min(0.85, 1 - Math.exp(-(now - enteredAt) / 1000 / stage.tau));
  }
  const pct = Math.max(1, Math.min(99, Math.round(((base + stage.weight * frac) / total) * 100)));
  const label = job.status === 'failed' ? `Stopped while ${stage.label.toLowerCase()}` : stage.label;
  return { pct, stageIndex: cur, stages, label, activity, elapsed };
}

export function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}
