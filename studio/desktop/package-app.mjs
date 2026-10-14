// Build "brag studio.app" (a personal, unsigned-for-distribution Mac app).
//
//   npm run app:package            → dist-app/brag studio.app
//   npm run app:package -- --install  → also copies it to /Applications
//
// The app is a thin launcher: it runs the studio from this repo checkout, so
// `git pull` + relaunch is the update path. It's ad-hoc signed so it runs on
// Apple Silicon; it isn't notarized, so it's meant for this Mac.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const studio = path.resolve(here, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(studio, 'package.json'), 'utf8'));
const NAME = 'brag studio';

const src = path.join(studio, 'node_modules', 'electron', 'dist', 'Electron.app');
if (!fs.existsSync(src)) {
  console.error('Electron is missing — run: node node_modules/electron/install.js');
  process.exit(1);
}

const outDir = path.join(studio, 'dist-app');
const appPath = path.join(outDir, `${NAME}.app`);
fs.rmSync(appPath, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
execFileSync('ditto', [src, appPath]);

const res = path.join(appPath, 'Contents', 'Resources');
fs.rmSync(path.join(res, 'default_app.asar'), { force: true });
const appDir = path.join(res, 'app');
fs.mkdirSync(appDir, { recursive: true });
fs.copyFileSync(path.join(here, 'main.cjs'), path.join(appDir, 'main.cjs'));
fs.writeFileSync(
  path.join(appDir, 'package.json'),
  JSON.stringify({ name: 'brag-studio', productName: NAME, version: pkg.version, main: 'main.cjs' }, null, 2),
);
fs.writeFileSync(path.join(appDir, 'location.json'), JSON.stringify({ studioDir: studio }, null, 2));
fs.copyFileSync(path.join(here, 'icon.icns'), path.join(res, 'electron.icns'));

const plist = path.join(appPath, 'Contents', 'Info.plist');
const set = (key, value) => execFileSync('plutil', ['-replace', key, '-string', value, plist]);
set('CFBundleName', NAME);
set('CFBundleDisplayName', NAME);
set('CFBundleIdentifier', 'dev.brag.studio');
set('CFBundleShortVersionString', pkg.version);
set('CFBundleVersion', pkg.version);
set('NSMicrophoneUsageDescription', 'brag studio records a short voice sample when you create your own cloned narration voice.');

execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath]);
console.log(`Built ${appPath}`);

if (process.argv.includes('--install')) {
  const dest = path.join('/Applications', `${NAME}.app`);
  fs.rmSync(dest, { recursive: true, force: true });
  execFileSync('ditto', [appPath, dest]);
  console.log(`Installed ${dest}`);
}
