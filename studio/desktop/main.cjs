// brag studio — desktop app shell (Electron).
//
// A thin native wrapper around the studio in this repo: it builds the
// production app when the code has changed, starts the server (or reuses one
// that's already running, e.g. `npm run dev`), and shows it in a window, with
// notifications when videos finish, downloads to ~/Downloads, and microphone
// access for recording a cloned voice.

const { app, BrowserWindow, Menu, Notification, dialog, shell, session, systemPreferences } = require('electron');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const APP_NAME = 'brag studio';
const DIST = '.next-app'; // the app's own build folder — never the dev server's .next
const PREFERRED_PORT = Number(process.env.BRAG_APP_PORT) || 4321;

app.setName(APP_NAME);
if (!app.requestSingleInstanceLock()) app.quit();

// Apps launched from Finder get a bare PATH; borrow the login shell's so
// node, npx, ffmpeg, claude, and Homebrew tools resolve like in Terminal.
function loginShellPath() {
  try {
    const out = execFileSync(process.env.SHELL || '/bin/zsh', ['-ilc', 'printf "__PATH__%s__PATH__" "$PATH"'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    return /__PATH__(.*)__PATH__/s.exec(out)?.[1] || '';
  } catch {
    return '';
  }
}
process.env.PATH = [loginShellPath(), process.env.PATH, '/opt/homebrew/bin', '/usr/local/bin'].filter(Boolean).join(':');

// Where the studio lives: next to this file when run from the repo, or the
// location recorded when the .app was packaged.
function studioDir() {
  const local = path.resolve(__dirname, '..');
  if (fs.existsSync(path.join(local, 'next.config.mjs'))) return local;
  try {
    const dir = JSON.parse(fs.readFileSync(path.join(__dirname, 'location.json'), 'utf8')).studioDir;
    if (fs.existsSync(path.join(dir, 'next.config.mjs'))) return dir;
  } catch {
    /* fall through */
  }
  return null;
}

let mainWin = null;
let splash = null;
let server = null; // the server we started (null if we reused one)
let baseUrl = null;
let quitting = false;

function getJson(url, timeout = 2500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

const isStudio = async (port) => !!(await getJson(`http://127.0.0.1:${port}/api/settings`))?.maxConcurrent;

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
}

async function pickPort() {
  for (let p = PREFERRED_PORT; p < PREFERRED_PORT + 50; p++) if (await portFree(p)) return p;
  throw new Error('No free port found.');
}

function newestMtime(dir, entries) {
  let newest = 0;
  const walk = (p) => {
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      return;
    }
    if (st.isDirectory()) for (const f of fs.readdirSync(p)) walk(path.join(p, f));
    else newest = Math.max(newest, st.mtimeMs);
  };
  for (const e of entries) walk(path.join(dir, e));
  return newest;
}

function needsBuild(dir) {
  const id = path.join(dir, DIST, 'BUILD_ID');
  if (!fs.existsSync(id)) return true;
  const src = newestMtime(dir, ['app', 'components', 'lib', 'next.config.mjs', 'package.json', 'instrumentation.js']);
  return src > fs.statSync(id).mtimeMs;
}

function showSplash() {
  splash = new BrowserWindow({ width: 460, height: 260, frame: false, resizable: false, backgroundColor: '#0b0c10', show: true });
  const html = `<!doctype html><html><body style="margin:0;background:#0b0c10;color:#eef0f5;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;-webkit-app-region:drag">
    <div style="font-size:28px;font-weight:800;letter-spacing:-.02em">brag<span style="color:#ff5c39">studio</span></div>
    <div id="s" style="margin-top:14px;color:#9aa1b1;font-size:14px">Starting…</div></body></html>`;
  splash.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

function splashStatus(text) {
  splash?.webContents.executeJavaScript(`document.getElementById('s').textContent=${JSON.stringify(text)}`).catch(() => {});
}

function run(cmd, args, opts, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, opts);
    const feed = (d) => d.toString().split(/\r?\n/).forEach((l) => l.trim() && onLine?.(l.trim()));
    child.stdout?.on('data', feed);
    child.stderr?.on('data', feed);
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} exited with ${code}`))));
  });
}

async function startServer(dir) {
  // Reuse a studio that's already running (e.g. `npm run dev`) — one engine per library.
  if (await isStudio(PREFERRED_PORT)) return `http://127.0.0.1:${PREFERRED_PORT}`;

  const env = { ...process.env, NEXT_DIST_DIR: DIST, NODE_ENV: 'production' };
  if (needsBuild(dir)) {
    splashStatus('Building the app (first launch after an update)…');
    await run(path.join(dir, 'node_modules', '.bin', 'next'), ['build'], { cwd: dir, env }, (l) => {
      if (/Compiled|Generating|Collecting|Finalizing/.test(l)) splashStatus(l.replace(/^[✓▲\s]+/, ''));
    });
  }
  splashStatus('Starting the studio…');
  const port = await pickPort();
  const logDir = app.getPath('logs');
  fs.mkdirSync(logDir, { recursive: true });
  const log = fs.openSync(path.join(logDir, 'server.log'), 'a');
  server = spawn(path.join(dir, 'node_modules', '.bin', 'next'), ['start', '-p', String(port)], {
    cwd: dir,
    env,
    detached: true, // own process group, so quitting can stop agents and renders too
    stdio: ['ignore', log, log],
  });
  for (let i = 0; i < 120; i++) {
    if (await isStudio(port)) return `http://127.0.0.1:${port}`;
    if (server.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`The studio server didn't start. See ${path.join(logDir, 'server.log')}`);
}

function createWindow(url) {
  mainWin = new BrowserWindow({
    width: 1320,
    height: 920,
    minWidth: 900,
    minHeight: 640,
    title: APP_NAME,
    backgroundColor: '#0b0c10',
    show: false,
  });
  mainWin.loadURL(url);
  mainWin.once('ready-to-show', () => {
    mainWin.show();
    splash?.close();
    splash = null;
  });
  // Links that open a new window (source documents, Voicebox downloads) go to the browser.
  mainWin.webContents.setWindowOpenHandler(({ url: u }) => {
    shell.openExternal(u);
    return { action: 'deny' };
  });
  mainWin.on('closed', () => (mainWin = null));
}

function setupSession() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler(async (_wc, permission, callback) => {
    if (permission === 'media') {
      const ok = process.platform !== 'darwin' || (await systemPreferences.askForMediaAccess('microphone'));
      return callback(ok);
    }
    callback(['notifications', 'clipboard-sanitized-write', 'fullscreen'].includes(permission));
  });
  ses.on('will-download', (_e, item) => {
    const target = path.join(app.getPath('downloads'), item.getFilename());
    item.setSavePath(target);
    item.once('done', (_ev, state) => {
      if (state === 'completed') {
        const n = new Notification({ title: 'Saved to Downloads', body: item.getFilename() });
        n.on('click', () => shell.showItemInFolder(target));
        n.show();
      }
    });
  });
}

// Notify when a video finishes or fails.
function watchJobs() {
  const last = new Map();
  setInterval(async () => {
    const d = await getJson(`${baseUrl}/api/jobs`, 4000);
    if (!d?.jobs) return;
    for (const j of d.jobs) {
      const prev = last.get(j.id);
      last.set(j.id, j.status);
      if (!prev || prev === j.status || !['queued', 'running'].includes(prev)) continue;
      if (j.status !== 'done' && j.status !== 'failed') continue;
      const n = new Notification({
        title: j.status === 'done' ? 'Your video is ready' : 'A video failed',
        body: j.title || j.filename || 'brag studio',
      });
      n.on('click', () => {
        if (!mainWin) createWindow(baseUrl);
        mainWin.loadURL(`${baseUrl}/jobs/${j.id}`);
        mainWin.show();
        mainWin.focus();
      });
      n.show();
    }
  }, 4000);
}

function buildMenu() {
  const go = (p) => () => {
    if (!mainWin) createWindow(baseUrl + p);
    else mainWin.loadURL(baseUrl + p);
    mainWin?.show();
  };
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: APP_NAME,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { label: 'Setup…', accelerator: 'Cmd+,', click: go('/setup') },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'File',
        submenu: [
          { label: 'New from Document', accelerator: 'Cmd+N', click: go('/') },
          { label: 'New from Idea', accelerator: 'Cmd+Shift+N', click: go('/idea') },
          { label: 'Library', accelerator: 'Cmd+L', click: go('/library') },
          { type: 'separator' },
          { role: 'close' },
        ],
      },
      { role: 'editMenu' },
      {
        label: 'View',
        submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }],
      },
      { role: 'windowMenu' },
    ]),
  );
}

app.on('second-instance', () => {
  if (mainWin) {
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.focus();
  }
});

app.whenReady().then(async () => {
  const dir = studioDir();
  if (!dir) {
    dialog.showErrorBox(APP_NAME, 'Could not find the brag studio folder. Re-package the app from the studio folder (npm run app:package).');
    app.quit();
    return;
  }
  showSplash();
  setupSession();
  try {
    baseUrl = await startServer(dir);
  } catch (err) {
    splash?.close();
    dialog.showErrorBox(APP_NAME, String(err.message || err));
    app.quit();
    return;
  }
  buildMenu();
  createWindow(baseUrl);
  watchJobs();
});

// Closing the window keeps the app (and any video in progress) running, like other Mac apps.
app.on('window-all-closed', () => {});
app.on('activate', () => {
  if (!mainWin && baseUrl) createWindow(baseUrl);
});

app.on('before-quit', async (e) => {
  if (quitting || !server) return;
  e.preventDefault();
  const d = await getJson(`${baseUrl}/api/jobs`, 3000);
  const busy = (d?.jobs || []).filter((j) => j.status === 'running' || j.status === 'queued');
  if (busy.length) {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Quit', 'Keep working'],
      defaultId: 1,
      cancelId: 1,
      message: busy.length === 1 ? 'A video is still being made.' : `${busy.length} videos are still being made.`,
      detail: "If you quit now, they'll be marked interrupted. You can resume them next time.",
    });
    if (response === 1) return;
  }
  quitting = true;
  try {
    process.kill(-server.pid, 'SIGTERM'); // the whole group: server, agents, renders
  } catch {
    /* already stopped */
  }
  app.quit();
});
