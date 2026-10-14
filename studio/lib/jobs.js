// Public job API used by the routes — a thin layer over the engine.
import { jobDirFor } from './paths.js';
import { findComposition } from './output.js';
import { bootEngine, cancelJob, deleteJob, enqueue, isRunning, queuePosition, resumeJob } from './engine.js';

export { bootEngine, cancelJob, deleteJob, isRunning, queuePosition, resumeJob };
export { readProgress } from './progress.js';

const STOPPED = ['failed', 'interrupted', 'cancelled'];

export const isBusy = (rec) => isRunning(rec.id) || rec.status === 'queued' || rec.status === 'running';

export const startJob = (rec) => enqueue(rec.id, { type: 'generate' });

export const startRevoice = (rec, voice, speed) =>
  enqueue(rec.id, { type: 'revoice', voice: { id: voice.id, name: voice.name }, ...(speed ? { speed } : {}) });

export const startRevise = (rec, feedback) => enqueue(rec.id, { type: 'revise', feedback });

export const startFinishRender = (rec) => enqueue(rec.id, { type: 'finish' });

// A stopped job whose composition is built but never rendered can be finished.
export function canFinishRender(rec) {
  return !rec.video && STOPPED.includes(rec.status) && !!findComposition(jobDirFor(rec.id));
}

export function canResume(rec) {
  return !rec.video && STOPPED.includes(rec.status);
}
