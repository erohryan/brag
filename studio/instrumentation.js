// Runs once when the studio server starts: resume queued jobs and mark any
// job that was running when the studio last stopped as interrupted.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootEngine } = await import('./lib/engine.js');
    bootEngine();
  }
}
