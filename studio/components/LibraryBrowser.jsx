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

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'docs', label: '📄 Documents' },
  { value: 'idea', label: '✨ Ideas' },
];

// `kind` pins the list to one job kind (used by the per-tab "recent" strips);
// without it, the full library shows filter chips.
export default function LibraryBrowser({ compact = false, kind = '' }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [jobs, setJobs] = useState(null);
  const activeKind = kind || filter;

  useEffect(() => {
    let alive = true;
    const url = `/api/jobs?q=${encodeURIComponent(compact ? '' : q)}&kind=${activeKind}`;
    const load = async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        if (alive) setJobs(data.jobs || []);
      } catch {
        if (alive) setJobs((j) => j || []);
      }
    };
    const t = setTimeout(load, compact ? 0 : 220);
    // Compact strips refresh so a just-started job shows up.
    const iv = compact ? setInterval(load, 4000) : null;
    return () => {
      alive = false;
      clearTimeout(t);
      if (iv) clearInterval(iv);
    };
  }, [q, compact, activeKind]);

  const list = compact ? (jobs || []).slice(0, 6) : jobs || [];
  const noun = activeKind === 'idea' ? 'ideas' : activeKind === 'docs' ? 'documents' : 'videos';

  return (
    <div>
      {!compact && (
        <div className="libtools">
          <input
            className="searchbar"
            type="text"
            placeholder="Search titles, prompts, filenames, tones…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {!kind && (
            <div className="modetabs" role="tablist" aria-label="Filter by kind">
              {FILTERS.map((f) => (
                <button
                  key={f.value || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.value}
                  className={filter === f.value ? 'active' : ''}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {jobs === null ? (
        <div className="empty">Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty">
          {compact
            ? `Nothing yet — your ${noun} will show up here.`
            : q
              ? 'No matches.'
              : `No ${noun} yet. Start one from the Document or Idea tab.`}
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
                  <span>
                    {j.kind === 'idea' ? '✨ idea' : '📄 doc'} · {j.tone}
                  </span>
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
