'use client';

import { useCallback, useEffect, useState } from 'react';

const ICON = { ok: '✓', warn: '!', fail: '✕' };
const MODELS = [
  ['', 'Default (your Claude Code model)'],
  ['claude-opus-5-5', 'Claude Opus 5.5 — recommended'],
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 — faster, cheaper'],
  ['claude-fable-5-1', 'Claude Fable 5.1 — most capable, pricier'],
];

export default function SetupView() {
  const [data, setData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState('');

  const load = useCallback(async (quick = false) => {
    if (!quick) setChecking(true);
    try {
      const d = await (await fetch(`/api/doctor${quick ? '?quick=1' : ''}`, { cache: 'no-store' })).json();
      setData(d);
      setSettings((s) => s || d.settings);
      return d;
    } finally {
      if (!quick) setChecking(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // While a fix runs, poll its log; when it finishes, re-run every check.
  const anyRunning = data && Object.values(data.fixes || {}).some((f) => f.state === 'running');
  useEffect(() => {
    if (!anyRunning) return;
    const iv = setInterval(async () => {
      const d = await load(true);
      if (!Object.values(d.fixes || {}).some((f) => f.state === 'running')) load();
    }, 2000);
    return () => clearInterval(iv);
  }, [anyRunning, load]);

  async function fix(id) {
    await fetch('/api/doctor/fix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load(true);
  }

  async function saveSettings(e) {
    e.preventDefault();
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setSettings(await res.json());
    setSaved('Saved');
    setTimeout(() => setSaved(''), 2000);
  }

  const summaryText = !data
    ? 'Checking your setup…'
    : data.summary === 'ok'
      ? 'Everything the studio needs is ready.'
      : data.summary === 'warn'
        ? 'Ready, with a few optional extras to set up.'
        : 'A few things need attention before videos can be made.';

  return (
    <div>
      <h1>Setup</h1>
      <p className="lede">{summaryText}</p>

      <div className="card checks">
        {!data && (
          <div className="hint">
            <span className="spinner" />
            Checking Claude sign-in, the renderer, and voices…
          </div>
        )}
        {data?.checks.map((c) => {
          const f = data.fixes?.[c.fix];
          return (
            <div key={c.id} className={`checkrow ${c.status}`}>
              <span className="checkicon">{ICON[c.status]}</span>
              <div className="checkbody">
                <div className="checklabel">
                  {c.label}
                  {c.optional && <span className="optional">optional</span>}
                </div>
                <div className="checkdetail">{c.detail}</div>
                {c.hint && <div className="checkdetail">{c.hint}</div>}
                {f && (
                  <div className={`fixlog ${f.state}`}>
                    {f.state === 'running' && <span className="spinner" />}
                    {f.state === 'done' ? 'Done.' : f.state === 'failed' ? 'Failed: ' : ''}
                    {f.log.slice(-4).join(' · ')}
                  </div>
                )}
              </div>
              <div className="checkaction">
                {c.fix && c.status !== 'ok' && (
                  <button type="button" className="iconbtn" disabled={f?.state === 'running'} onClick={() => fix(c.fix)}>
                    {f?.state === 'running' ? 'Working…' : c.fixLabel || 'Fix'}
                  </button>
                )}
                {c.fix && c.status === 'ok' && c.fixLabel && (
                  <button type="button" className="linkbtn" disabled={f?.state === 'running'} onClick={() => fix(c.fix)}>
                    {c.fixLabel}
                  </button>
                )}
                {c.link && (
                  <a className="iconbtn" href={c.link} target="_blank" rel="noreferrer">
                    {c.linkLabel || 'Open'}
                  </a>
                )}
              </div>
            </div>
          );
        })}
        <div className="actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn secondary" onClick={() => load()} disabled={checking}>
            {checking ? 'Checking…' : 'Check again'}
          </button>
        </div>
      </div>

      {settings && (
        <form className="card settings" onSubmit={saveSettings}>
          <h2 style={{ marginTop: 0 }}>Settings</h2>
          <div className="options">
            <div className="field">
              <label htmlFor="s-model">Model</label>
              <select id="s-model" value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}>
                {MODELS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-conc">Videos at a time</label>
              <select id="s-conc" value={settings.maxConcurrent} onChange={(e) => setSettings({ ...settings, maxConcurrent: Number(e.target.value) })}>
                <option value={1}>1 (recommended)</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-budget">Spend cap per run (USD, 0 = none)</label>
              <input
                id="s-budget"
                type="text"
                inputMode="decimal"
                value={settings.maxBudgetUsd}
                onChange={(e) => setSettings({ ...settings, maxBudgetUsd: e.target.value })}
              />
            </div>
          </div>
          <p className="hint" style={{ color: 'var(--muted)' }}>
            Each video is a full Claude agent session; its cost is shown on the video&apos;s page. A spend cap stops a
            run that exceeds it.
          </p>
          <div className="actions">
            <button type="submit" className="btn">
              Save settings
            </button>
            {saved && <span className="hint">{saved}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
