'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { previewVoice } from './voicePreview.js';

const TERMINAL = new Set(['done', 'failed']);

export default function JobView({ id }) {
  const [job, setJob] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [tick, setTick] = useState(0);
  const [voices, setVoices] = useState([]);
  const [newVoice, setNewVoice] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    fetch('/api/voices')
      .then((r) => r.json())
      .then((d) => setVoices(d.voices || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    let timer;

    async function poll() {
      try {
        const res = await fetch(`/api/jobs/${id}`, { cache: 'no-store' });
        if (res.status === 404) {
          if (alive) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!alive) return;
        setJob(data);
        if (!TERMINAL.has(data.status)) {
          timer = setTimeout(poll, 1200);
        }
      } catch {
        if (alive) timer = setTimeout(poll, 2500);
      }
    }
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, tick]);

  // Default the "new voice" selector to the job's current voice once known.
  useEffect(() => {
    if (job && !newVoice) setNewVoice(job.voice || 'af_heart');
  }, [job, newVoice]);

  function preview() {
    if (!newVoice) return;
    setPreviewing(true);
    previewVoice(newVoice, {
      onEnd: () => setPreviewing(false),
      onError: () => setPreviewing(false),
    });
  }

  async function rebuild() {
    if (!newVoice || rebuilding) return;
    setRebuilding(true);
    try {
      const res = await fetch(`/api/jobs/${id}/revoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: newVoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rebuild failed');
      // Optimistically flip to running and restart polling.
      setJob((j) => (j ? { ...j, status: 'running', voice: newVoice } : j));
      setTick((t) => t + 1);
    } catch (err) {
      alert(err.message || 'Rebuild failed');
    } finally {
      setRebuilding(false);
    }
  }

  // Keep the log scrolled to the newest line while running.
  useEffect(() => {
    if (logRef.current && job && !TERMINAL.has(job.status)) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [job]);

  if (notFound) {
    return (
      <div>
        <h1>Not found</h1>
        <p className="lede">That job doesn&apos;t exist. </p>
        <Link className="btn secondary" href="/library">
          Back to library
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div>
        <h1>
          <span className="spinner" />
          Loading…
        </h1>
      </div>
    );
  }

  const running = !TERMINAL.has(job.status);
  const progress = job.progress || [];

  return (
    <div>
      <h1>{job.title || job.filename}</h1>
      <div className="meta">
        <span className={`badge ${job.status}`}>
          {running && <span className="spinner" />}
          {job.status}
        </span>
        <span className="badge">{job.tone}</span>
        <span className="badge">{job.format}</span>
        <span className="badge">
          {job.narration
            ? `voice: ${voices.find((v) => v.id === job.voice)?.name || job.voice || 'default'}`
            : 'no narration'}
        </span>
        {job.docRel && (
          <a className="badge" href={`/api/files/${job.docRel}`} target="_blank" rel="noreferrer">
            source document ↗
          </a>
        )}
      </div>

      {job.status === 'done' && job.video && (
        <>
          <div className="videowrap">
            <video
              controls
              autoPlay
              playsInline
              poster={job.poster ? `/api/files/${job.poster}` : undefined}
              src={`/api/files/${job.video}`}
            />
          </div>
          {job.shareCopy && (
            <>
              <h2>Share copy</h2>
              <div className="sharecopy">{job.shareCopy}</div>
            </>
          )}
          <div className="actions">
            <a className="btn" href={`/api/files/${job.video}`} download>
              Download video
            </a>
            <Link className="btn secondary" href="/">
              Make another
            </Link>
          </div>
        </>
      )}

      {job.status === 'failed' && (
        <div className="card">
          <div className="err" style={{ marginTop: 0 }}>
            Generation failed{job.error ? `: ${job.error}` : ''}.
          </div>
          <p className="hint" style={{ color: 'var(--muted)' }}>
            See the log below for details. Common causes: the brag-docs skill or
            Hyperframes CLI isn&apos;t installed/authed on this machine.
          </p>
        </div>
      )}

      {!running && (
        <div className="revoice card">
          <h2 style={{ marginTop: 0 }}>Voice</h2>
          <p className="hint" style={{ color: 'var(--muted)', marginTop: 0 }}>
            {job.narration
              ? 'Swap the narration voice and rebuild — the visuals and script stay the same.'
              : 'This video has no narration. Pick a voice to add one and rebuild.'}
          </p>
          <div className="voicerow">
            <div className="field">
              <label>New voice</label>
              <select value={newVoice} onChange={(e) => setNewVoice(e.target.value)}>
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.lang} ({v.gender})
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="iconbtn" onClick={preview} disabled={previewing}>
              {previewing ? <span className="spinner" /> : '▶'} Preview
            </button>
            <button type="button" className="btn" onClick={rebuild} disabled={rebuilding}>
              {rebuilding ? 'Starting…' : 'Rebuild with this voice'}
            </button>
          </div>
        </div>
      )}

      <h2>{running ? 'Progress' : 'Log'}</h2>
      <div className="progress" ref={logRef}>
        {progress.length === 0 && <div className="row">Waiting for the agent to start…</div>}
        {progress.map((p, i) => (
          <div className={`row ${p.kind || ''}`} key={i}>
            {p.text}
          </div>
        ))}
      </div>
    </div>
  );
}
