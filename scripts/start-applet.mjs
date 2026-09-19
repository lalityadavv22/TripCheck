import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serverDist = path.join(root, 'server/dist/index.js');
const clientIndex = path.join(root, 'server/public/index.html');

if (!fs.existsSync(serverDist) || !fs.existsSync(clientIndex)) {
  console.log('[start-applet] Missing build artifacts. Running initial build...');
  execSync('npm run build', { stdio: 'inherit', cwd: root });
}

// Make sure server data directories exist
const serverData = path.join(root, 'server/data');
['tmp', 'logs', 'backups', 'uploads'].forEach((dir) => {
  fs.mkdirSync(path.join(serverData, dir), { recursive: true });
});

// Parse command line arguments (--port 3000 --host 0.0.0.0)
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--port' && process.argv[i + 1]) {
    process.env.PORT = process.argv[++i];
  } else if (process.argv[i] === '--host' && process.argv[i + 1]) {
    process.env.HOST = process.argv[++i];
  }
}

process.env.PORT = process.env.PORT || '3000';
process.env.HOST = process.env.HOST || '0.0.0.0';
process.env.NODE_ENV = 'production';

console.log(`[start-applet] Launching TREK unified server on ${process.env.HOST}:${process.env.PORT}...`);

const child = spawn(
  'node',
  ['--require', 'tsconfig-paths/register', 'dist/index.js'],
  {
    cwd: path.join(root, 'server'),
    stdio: 'inherit',
    env: { ...process.env },
  }
);

child.on('error', (err) => {
  console.error('[start-applet] Server process error:', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

const handleSignal = (sig) => {
  try {
    child.kill(sig);
  } catch {}
};

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));
