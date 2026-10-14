// Tool-call policy for unattended agent runs. Enforced through a PreToolUse
// hook, which runs on every tool call regardless of permission mode or the
// user's own allow-rules.
//
// This is a guardrail, not an OS sandbox: it blocks the obvious ways an
// instruction smuggled into an uploaded document could reach outside the job
// (writing elsewhere, reading credentials, contacting other hosts, touching
// the system). The agent is also told to treat document content as data.

import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

const SENSITIVE = [
  '.ssh', '.aws', '.gnupg', '.config/gh', '.config/anthropic', '.netrc', '.npmrc', '.pypirc',
  '.docker/config.json', '.kube', 'Library/Keychains', 'Library/Cookies',
  '.claude/.credentials.json', '.zsh_history', '.bash_history',
].map((p) => path.join(HOME, p));

// Commands that have no business in a video job, matched by command name.
const DENY_CMDS = new Map([
  ...['sudo', 'su', 'doas'].map((c) => [c, 'privilege escalation']),
  ...['ssh', 'scp', 'sftp', 'telnet', 'ftp', 'nc', 'ncat', 'netcat', 'socat'].map((c) => [c, 'remote connections']),
  ...['osascript', 'launchctl', 'crontab', 'security', 'systemsetup', 'csrutil', 'diskutil', 'defaults'].map((c) => [c, 'system configuration']),
  ...['kill', 'pkill', 'killall'].map((c) => [c, 'stopping other processes']),
  ...['shutdown', 'reboot', 'halt'].map((c) => [c, 'power control']),
  ...['chown'].map((c) => [c, 'changing ownership']),
]);

const BASH_DENY = [
  [/\bgit\s+(push|remote\s+add)\b/, 'publishing code'],
  [/\brsync\b[^|;&]*\s\S+:\S*/, 'remote copies'],
  [/\bchmod\s+\S*[+ugo]*s\b/, 'setuid permissions'],
  [/(curl|wget)[^|;&]*\|\s*(ba|z)?sh\b/, 'piping downloads into a shell'],
  [/>\s*(~|\$HOME)\/\./, 'writing to dotfiles'],
];

// First word of every simple command in a shell line (pipes, chains, subshells).
function commandNames(cmd) {
  return cmd
    .split(/\|\||&&|[|;&\n]|\$\(|`/)
    .map((seg) => seg.trim().split(/\s+/).filter((w) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(w))[0] || '')
    .map((w) => path.basename(w.replace(/^["'(]+/, '')))
    .filter(Boolean);
}

const within = (p, dir) => {
  const rel = path.relative(dir, p);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

function resolvePath(p, cwd) {
  if (!p) return null;
  const s = String(p).replace(/^~(?=$|\/)/, HOME);
  return path.resolve(cwd, s);
}

function isSensitive(abs) {
  return SENSITIVE.some((s) => within(abs, s)) || /(^|\/)\.env(\.|$)/.test(abs);
}

// Hosts the agent may reach with curl/wget: local services (Voicebox) and the
// asset/package hosts skills legitimately use (web fonts, CDNs, registries).
const ALLOWED_HOSTS = [
  '127.0.0.1', 'localhost', '::1',
  'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com',
  'registry.npmjs.org', 'pypi.org', 'files.pythonhosted.org',
];

const TLD = /\.(com|net|org|io|co|dev|app|ai|sh|me|xyz|info|biz|us|uk|de|fr|eu|ca|au|nz|in|jp|cn|ru|br|tech|site|online|cloud|link|to|ly|gg)$/i;
const VALUE_FLAGS = new Set(['-o', '--output', '-d', '--data', '--data-binary', '--data-raw', '-H', '--header', '-F', '--form', '-T', '--upload-file', '-u', '--user', '-A', '--user-agent', '-e', '--referer', '-O', '--output-document', '-P']);

function deniedNetwork(cmd) {
  const calls = cmd.split(/\|\||&&|[|;&\n]/).filter((c) => /\b(curl|wget)\b/.test(c));
  for (const c of calls) {
    const toks = c.trim().split(/\s+/);
    for (let i = 1; i < toks.length; i++) {
      if (VALUE_FLAGS.has(toks[i - 1])) continue;
      const t = toks[i].replace(/^["']|["']$/g, '');
      if (t.startsWith('-')) continue;
      const url = /^https?:\/\/([^/:\s'"?#]+)/i.exec(t);
      const bare = !url && /^([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?::\d+)?(?:\/\S*)?$/i.exec(t);
      const host = url ? url[1] : bare && (TLD.test(bare[1]) || /^\d+(\.\d+){3}$/.test(bare[1])) ? bare[1] : null;
      if (host && !ALLOWED_HOSTS.includes(host.toLowerCase())) return true;
    }
  }
  return false;
}

export function decide(toolName, input, { jobDir, extraWritable = [] }) {
  const writable = [jobDir, os.tmpdir(), '/tmp', '/private/tmp', ...extraWritable];
  const inp = input || {};

  if (toolName === 'WebFetch') return 'fetching web pages is disabled for studio jobs (web search is allowed)';

  if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(toolName)) {
    const abs = resolvePath(inp.file_path || inp.notebook_path, jobDir);
    if (!abs || !writable.some((d) => within(abs, d))) {
      return `writing outside this job's folder is not allowed (${inp.file_path || inp.notebook_path})`;
    }
    return null;
  }

  if (['Read', 'Glob', 'Grep'].includes(toolName)) {
    const abs = resolvePath(inp.file_path || inp.path, jobDir);
    if (abs && isSensitive(abs)) return `reading ${inp.file_path || inp.path} is not allowed`;
    return null;
  }

  if (toolName === 'Bash') {
    const cmd = String(inp.command || '');
    for (const name of commandNames(cmd)) if (DENY_CMDS.has(name)) return `blocked: ${DENY_CMDS.get(name)} (${name})`;
    for (const [re, why] of BASH_DENY) if (re.test(cmd)) return `blocked: ${why}`;
    if (deniedNetwork(cmd)) return 'blocked: network access outside the allowed hosts (local Voicebox, web fonts, CDNs, package registries)';
    for (const s of SENSITIVE) {
      const short = s.replace(HOME, '~');
      if (cmd.includes(s) || cmd.includes(short) || cmd.includes(s.replace(HOME, '$HOME'))) {
        return `blocked: touches ${short}`;
      }
    }
    // rm only inside writable locations.
    if (/\brm\b/.test(cmd)) {
      const targets = cmd.split(/[|;&]/).filter((c) => /\brm\b/.test(c)).flatMap((c) => c.trim().split(/\s+/).slice(1));
      for (const t of targets) {
        if (t.startsWith('-')) continue;
        const abs = resolvePath(t.replace(/^["']|["']$/g, ''), jobDir);
        if (abs && !writable.some((d) => within(abs, d))) return `blocked: deleting ${t} outside this job's folder`;
      }
    }
    return null;
  }

  return null; // other tools (Skill, WebSearch, TodoWrite, …) are fine
}

// PreToolUse hook for the Agent SDK.
export function makePolicyHook(jobDir, onDeny) {
  return async (input) => {
    if (input?.hook_event_name !== 'PreToolUse') return {};
    const reason = decide(input.tool_name, input.tool_input, { jobDir });
    if (!reason) return {};
    onDeny?.(input.tool_name, reason);
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `brag studio policy: ${reason}.`,
      },
    };
  };
}
