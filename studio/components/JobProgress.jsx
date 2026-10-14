'use client';

import { useEffect, useState } from 'react';
import { computeProgress, formatElapsed } from '../lib/stages.js';

// Friendly progress card: current stage, % bar, elapsed time, stage steps, and
// the agent's latest plain-English update.
export default function JobProgress({ job }) {
  const active = job.status === 'running' || job.status === 'queued';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [active]);

  const p = computeProgress(job, now);
  const failed = job.status === 'failed';

  return (
    <div className={`jobprog card${failed ? ' failed' : ''}`}>
      <div className="jp-head">
        <div className="jp-stage">
          {active && <span className="spinner" />}
          {p.label}
          {active ? '…' : ''}
        </div>
        <div className="jp-meta">
          {p.pct}% · {formatElapsed(p.elapsed)}
        </div>
      </div>

      <div
        className="jp-bar"
        role="progressbar"
        aria-label="Video generation progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p.pct}
      >
        <div className={`jp-fill${active ? ' live' : ''}`} style={{ width: `${p.pct}%` }} />
      </div>

      <ol className="jp-steps">
        {p.stages.map((s, i) => {
          const state = i < p.stageIndex ? 'done' : i === p.stageIndex ? (failed ? 'failed' : 'active') : 'pending';
          return (
            <li key={s.key} className={state}>
              <span className="jp-dot">{state === 'done' ? '✓' : state === 'failed' ? '✕' : ''}</span>
              {s.label}
            </li>
          );
        })}
      </ol>

      {active && p.activity && <div className="jp-activity">{p.activity}</div>}
    </div>
  );
}
