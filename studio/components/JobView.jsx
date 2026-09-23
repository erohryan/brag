'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const TERMINAL = new Set(['done', 'failed']);

export default function JobView({ id }) {
  const [job, setJob] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const logRef = useRef(null);

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
  }, [id]);

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
        <span className="badge">{job.narration ? 'narration on' : 'no narration'}</span>
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
