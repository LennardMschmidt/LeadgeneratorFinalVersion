import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const VITE_BIN = './node_modules/vite/bin/vite.js';
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;
const RETRY_PATTERN = 'ECANCELED: operation canceled, read';

let child = null;
let stopping = false;

const forwardSignal = (signal) => {
  stopping = true;
  if (child && !child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

function runOnce() {
  return new Promise((resolve) => {
    const stderrChunks = [];

    child = spawn(process.execPath, [VITE_BIN], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderrChunks.push(Buffer.from(chunk));
      process.stderr.write(chunk);
    });

    child.on('error', (error) => {
      resolve({
        code: 1,
        signal: null,
        stderrText: String(error?.stack || error),
      });
    });

    child.on('exit', (code, signal) => {
      resolve({
        code,
        signal,
        stderrText: Buffer.concat(stderrChunks).toString('utf8'),
      });
    });
  });
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const result = await runOnce();

  if (result.code === 0 || result.signal) {
    process.exit(result.code ?? 0);
  }

  if (!stopping && result.stderrText.includes(RETRY_PATTERN) && attempt < MAX_ATTEMPTS) {
    console.error(
      `[vite-retry] Startup hit "${RETRY_PATTERN}". Retrying (${attempt + 1}/${MAX_ATTEMPTS})...`,
    );
    await sleep(RETRY_DELAY_MS);
    continue;
  }

  process.exit(result.code ?? 1);
}
