'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { previewVoice } from './voicePreview.js';
import VoiceSelect from './VoiceSelect.jsx';
import JobProgress from './JobProgress.jsx';
import CreateVoice from './CreateVoice.jsx';
import useVoices from './useVoices.js';
import { SPEED } from '../lib/voices.js';

const BUSY = new Set(['queued', 'running']);
const STOPPED = new Set(['failed', 'interrupted', 'cancelled']);

const money = (n) => (n >= 10 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`);
const when = (t) => (t ? new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

async function post(url, body, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export default function JobView({ id }) {
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [tick, setTick] = useState(0);
  const { voices, reload: reloadVoices } = useVoices();
  const [creatingVoice, setCreatingVoice] = useState(false);
  const [newVoice, setNewVoice] = useState('');
  const [newSpeed, setNewSpeed] = useState(SPEED.default);
  const [previewing, setPreviewing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [pending, setPending] = useState(''); // which action is in flight
  const [feedback, setFeedback] = useState('');
  const [viewing, setViewing] = useState(null); // a previous version being played
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
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
        if (BUSY.has(data.status)) timer = setTimeout(poll, 1200);
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

  useEffect(() => {
    if (job && !newVoice) {
      setNewVoice(job.voice || 'af_heart');
      if (job.speed) setNewSpeed(job.speed);
    }
  }, [job, newVoice]);

  useEffect(() => {
    if (logRef.current && job && BUSY.has(job.status)) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [job]);

  // Run an action that (re)starts work on this job, then resume polling.
  async function act(name, url, body, optimistic = 'queued') {
    setPending(name);
    try {
      await post(url, body);
      setViewing(null);
      setJob((j) => (j ? { ...j, status: optimistic, lastError: undefined, canFinish: false, canResume: false } : j));
      setTick((t) => t + 1);
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    } finally {
      setPending('');
    }
  }

  function preview() {
    if (!newVoice) return;
    setVoiceError('');
    setPreviewing(true);
    previewVoice(newVoice, {
      onEnd: () => setPreviewing(false),
      onError: (msg) => {
        setPreviewing(false);
        setVoiceError(msg);
      },
    });
  }

  async function cancel() {
    setPending('cancel');
    try {
      await post(`/api/jobs/${id}/cancel`);
      setTick((t) => t + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setPending('');
    }
  }

  async function saveTitle() {
    const title = titleDraft.trim();
    if (!title || title === job.title) return setRenaming(false);
    try {
      await post(`/api/jobs/${id}`, { title }, 'PATCH');
      setJob((j) => ({ ...j, title }));
    } catch (err) {
      alert(err.message);
    }
    setRenaming(false);
  }

  async function remove() {
    if (!window.confirm(`Delete "${job.title || job.filename}" and all its files? This can't be undone.`)) return;
    try {
      await post(`/api/jobs/${id}`, null, 'DELETE');
      router.push('/library');
    } catch (err) {
      alert(err.message);
    }
  }

  if (notFound) {
    return (
      <div>
        <h1>Not found</h1>
        <p className="lede">That video doesn&apos;t exist (it may have been deleted).</p>
        <Link className="btn secondary" href="/library">
          Back to library
        </Link>
      </div>
    );
  }
  if (!job) {
    return (
      <h1>
        <span className="spinner" />
        Loading…
      </h1>
    );
  }

  const busy = BUSY.has(job.status);
  const stopped = STOPPED.has(job.status);
  const done = job.status === 'done' && job.video;
  const progress = job.progress || [];
  const versions = job.versions || [];
  const shown = viewing || { video: job.video, poster: job.poster };

  return (
    <div>
      <div className="titlerow">
        {renaming ? (
          <input
            className="titleinput"
            autoFocus
            value={titleDraft}
            maxLength={120}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <h1>{job.title || job.filename}</h1>
        )}
        {!renaming && (
          <button
            type="button"
            className="linkbtn"
            onClick={() => {
              setTitleDraft(job.title || '');
              setRenaming(true);
            }}
          >
            rename
          </button>
        )}
      </div>

      <div className="meta">
        <span className={`badge ${job.status}`}>
          {busy && <span className="spinner" />}
          {job.status === 'queued' && job.queuePosition ? `queued · #${job.queuePosition}` : job.status}
        </span>
        <span className="badge">{job.tone}</span>
        <span className="badge">{job.format}</span>
        <span className="badge">
          {job.music === false && job.sfx === false ? 'no music / sfx' : job.music === false ? 'sfx only' : job.sfx === false ? 'music only' : 'music + sfx'}
        </span>
        <span className="badge">
          {job.narration ? `voice: ${voices.find((v) => v.id === job.voice)?.name || job.voiceName || job.voice || 'default'}` : 'no narration'}
        </span>
        {job.costUsd > 0 && (
          <span className="badge" title={job.lastRun ? `Last run: ${money(job.lastRun.costUsd)} · ${job.lastRun.turns} turns` : undefined}>
            {money(job.costUsd)} spent
          </span>
        )}
        {job.docRel && (
          <a className="badge" href={`/api/files/${job.docRel}`} target="_blank" rel="noreferrer">
            {job.kind === 'idea' ? 'prompt ↗' : 'source document ↗'}
          </a>
        )}
      </div>

      {job.kind === 'idea' && job.prompt && (
        <details className="promptcard" open={!done}>
          <summary>The idea{job.assets?.length ? ` · ${job.assets.length} brand asset${job.assets.length > 1 ? 's' : ''}` : ''}</summary>
          <div className="sharecopy">{job.prompt}</div>
        </details>
      )}

      {(busy || stopped) && <JobProgress job={job} />}

      {busy && (
        <div className="actions" style={{ marginTop: -8, marginBottom: 18 }}>
          <button type="button" className="btn secondary" onClick={cancel} disabled={pending === 'cancel'}>
            {pending === 'cancel' ? 'Cancelling…' : job.status === 'queued' ? 'Remove from queue' : 'Cancel'}
          </button>
          {job.video && <span className="hint">The current video stays as it is until this finishes.</span>}
        </div>
      )}

      {stopped && (
        <div className="card">
          <div className={job.status === 'failed' ? 'err' : 'hint'} style={{ marginTop: 0 }}>
            {job.status === 'failed' && `Generation failed${job.error ? `: ${job.error}` : ''}.`}
            {job.status === 'interrupted' && 'This video was interrupted when the studio closed.'}
            {job.status === 'cancelled' && 'You cancelled this video.'}
          </div>
          <p className="hint" style={{ color: 'var(--muted)' }}>
            {job.canFinish
              ? 'The animation was fully built — only the final render is missing. Finish it without regenerating anything, or start over.'
              : 'Start it again from the beginning. Open Show log below for details.'}
          </p>
          <div className="actions" style={{ marginTop: 12 }}>
            {job.canFinish && (
              <button type="button" className="btn" disabled={!!pending} onClick={() => act('finish', `/api/jobs/${id}/finish`)}>
                {pending === 'finish' ? 'Starting…' : 'Finish render'}
              </button>
            )}
            {job.canResume && (
              <button
                type="button"
                className={job.canFinish ? 'btn secondary' : 'btn'}
                disabled={!!pending}
                onClick={() => act('resume', `/api/jobs/${id}/resume`)}
              >
                {pending === 'resume' ? 'Starting…' : job.canFinish ? 'Start over' : 'Try again'}
              </button>
            )}
          </div>
        </div>
      )}

      {done && job.lastError && !busy && <div className="notice">{job.lastError}</div>}

      {job.video && (done || busy) && (
        <>
          <div className="videowrap">
            <video
              key={shown.video}
              controls
              autoPlay={!busy}
              playsInline
              poster={shown.poster ? `/api/files/${shown.poster}` : undefined}
              src={`/api/files/${shown.video}`}
            />
          </div>
          {viewing && (
            <div className="viewingbar">
              Playing version {viewing.n} — {viewing.label}.{' '}
              <button type="button" className="linkbtn" onClick={() => setViewing(null)}>
                Back to the current video
              </button>
            </div>
          )}
          {!viewing && job.shareCopy && (
            <>
              <h2>Share copy</h2>
              <div className="sharecopy">{job.shareCopy}</div>
            </>
          )}
          <div className="actions">
            <a className="btn" href={`/api/files/${shown.video}`} download>
              Download {viewing ? `version ${viewing.n}` : 'video'}
            </a>
            <Link className="btn secondary" href={job.kind === 'idea' ? '/idea' : '/'}>
              Make another
            </Link>
          </div>
        </>
      )}

      {done && !busy && (
        <div className="card revise">
          <h2 style={{ marginTop: 0 }}>Revise</h2>
          <p className="hint" style={{ color: 'var(--muted)', marginTop: 0 }}>
            Describe what to change — the studio edits this video instead of starting over, and keeps the
            current cut as a version you can go back to.
          </p>
          <textarea
            className="transcript"
            rows={3}
            maxLength={4000}
            value={feedback}
            placeholder="e.g. Make the headline bigger, cut the third scene, and end on the logo for 2 extra seconds."
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              disabled={!feedback.trim() || !!pending}
              onClick={async () => {
                if (await act('revise', `/api/jobs/${id}/revise`, { feedback })) setFeedback('');
              }}
            >
              {pending === 'revise' ? 'Starting…' : 'Revise video'}
            </button>
          </div>
        </div>
      )}

      {versions.length > 0 && (
        <div className="card versions">
          <h2 style={{ marginTop: 0 }}>Versions</h2>
          <ol>
            <li className={!viewing ? 'current' : ''}>
              <span className="vtag">v{versions.length + 1}</span>
              <span className="vlabel">{job.versionLabel || 'Current'}</span>
              <span className="vwhen">current</span>
              {viewing && (
                <button type="button" className="linkbtn" onClick={() => setViewing(null)}>
                  play
                </button>
              )}
            </li>
            {[...versions].reverse().map((v) => (
              <li key={v.n} className={viewing?.n === v.n ? 'current' : ''}>
                <span className="vtag">v{v.n}</span>
                <span className="vlabel">{v.label}</span>
                <span className="vwhen">{when(v.at)}</span>
                <button type="button" className="linkbtn" onClick={() => setViewing(v)}>
                  play
                </button>
                <a className="linkbtn" href={`/api/files/${v.video}`} download>
                  download
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!busy && job.video && (
        <div className="revoice card">
          <h2 style={{ marginTop: 0 }}>Voice</h2>
          <p className="hint" style={{ color: 'var(--muted)', marginTop: 0 }}>
            {job.narration
              ? 'Swap the narration voice and rebuild — the visuals and script stay the same.'
              : 'This video has no narration. Pick a voice to add one and rebuild.'}
          </p>
          <div className="voicerow">
            <div className="field">
              <label>New voice ({voices.length} available)</label>
              <VoiceSelect voices={voices} value={newVoice} onChange={(e) => setNewVoice(e.target.value)} />
            </div>
            <button type="button" className="iconbtn" onClick={preview} disabled={previewing}>
              {previewing ? <span className="spinner" /> : '▶'} Preview
            </button>
            <button type="button" className="iconbtn" onClick={() => setCreatingVoice(true)}>
              + Create your voice
            </button>
            <button
              type="button"
              className="btn"
              disabled={!!pending}
              onClick={() => act('revoice', `/api/jobs/${id}/revoice`, { voice: newVoice, speed: newSpeed })}
            >
              {pending === 'revoice' ? 'Starting…' : 'Rebuild with this voice'}
            </button>
          </div>
          <div className="field" style={{ marginTop: 14, maxWidth: 320 }}>
            <label>Speed — {newSpeed.toFixed(2)}×</label>
            <input type="range" min={SPEED.min} max={SPEED.max} step={SPEED.step} value={newSpeed} onChange={(e) => setNewSpeed(Number(e.target.value))} />
          </div>
          {voiceError && <div className="err">{voiceError}</div>}
          <CreateVoice
            open={creatingVoice}
            onClose={() => setCreatingVoice(false)}
            onCreated={async (v) => {
              await reloadVoices();
              setNewVoice(v.id);
            }}
          />
        </div>
      )}

      <details className="logbox">
        <summary>
          Show log <span className="hint">({progress.length} entries)</span>
        </summary>
        <div className="progress" ref={logRef}>
          {progress.length === 0 && <div className="row">Waiting for the agent to start…</div>}
          {progress.map((p, i) => (
            <div className={`row ${p.kind || ''}`} key={i}>
              {p.text}
            </div>
          ))}
        </div>
      </details>

      <div className="dangerzone">
        <button type="button" className="linkbtn danger" onClick={remove}>
          Delete this video
        </button>
      </div>
    </div>
  );
}
