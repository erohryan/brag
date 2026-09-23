'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function fmtDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function LibraryBrowser({ compact = false }) {
  const [q, setQ] = useState('');
  const [jobs, setJobs] = useState(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jobs?q=${encodeURIComponent(q)}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (alive) setJobs(data.jobs || []);
      } catch {
        if (alive) setJobs([]);
      }
    }, compact ? 0 : 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, compact]);

  // In compact mode, refresh periodically so a just-started job appears.
  useEffect(() => {
    if (!compact) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch('/api/jobs', { cache: 'no-store' });
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch {
        /* ignore */
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [compact]);

  const list = compact ? (jobs || []).slice(0, 6) : jobs || [];

  return (
    <div>
      {!compact && (
        <input
          className="searchbar"
          type="text"
          placeholder="Search documents and videos…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}

      {jobs === null ? (
        <div className="empty">Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty">
          {compact
            ? 'Nothing yet — your generated videos will show up here.'
            : q
              ? 'No matches.'
              : 'No videos yet. Head to New to make your first one.'}
        </div>
      ) : (
        <div className="grid">
          {list.map((j) => (
            <Link className="tile" key={j.id} href={`/jobs/${j.id}`}>
              <div
                className="thumb"
                style={
                  j.poster
                    ? { backgroundImage: `url(/api/files/${j.poster})` }
                    : undefined
                }
              >
                {!j.poster &&
                  (j.status === 'done' ? '▶' : j.status === 'failed' ? '⚠ failed' : '⏳ ' + j.status)}
              </div>
              <div className="body">
                <p className="t">{j.title || j.filename}</p>
                <div className="sub">
                  <span>{j.tone}</span>
                  <span>{fmtDate(j.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
