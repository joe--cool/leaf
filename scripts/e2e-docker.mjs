import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const composeArgs = [
  'compose',
  '-p',
  'leaf-e2e',
  '-f',
  'docker-compose.yml',
  '-f',
  'docker-compose.e2e.yml',
];
const e2eBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:18080';
const artifactsDir = join(process.cwd(), 'test-results', 'e2e-docker');
const runnerEnv = {
  ...process.env,
  PLAYWRIGHT_BASE_URL: e2eBaseUrl,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? e2eBaseUrl,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: runnerEnv,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 1}`);
  }
}

function cleanup() {
  const result = spawnSync('docker', [...composeArgs, 'down', '-v', '--remove-orphans'], {
    stdio: 'inherit',
    env: runnerEnv,
  });

  if (result.status !== 0) {
    console.error('E2E cleanup failed.');
  }
}

function saveLogs() {
  mkdirSync(artifactsDir, { recursive: true });

  const apiLogs = spawnSync('docker', [...composeArgs, 'logs', '--no-color', 'api'], {
    env: runnerEnv,
    encoding: 'utf8',
  });
  const webLogs = spawnSync('docker', [...composeArgs, 'logs', '--no-color', 'web'], {
    env: runnerEnv,
    encoding: 'utf8',
  });

  const apiLogPath = join(artifactsDir, 'api.log');
  const webLogPath = join(artifactsDir, 'web.log');

  writeFileSync(apiLogPath, apiLogs.stdout ?? '');
  writeFileSync(webLogPath, webLogs.stdout ?? '');

  console.error(`Saved API logs to ${apiLogPath}`);
  console.error(`Saved web logs to ${webLogPath}`);

  if (apiLogs.status !== 0 || webLogs.status !== 0) {
    console.error('Failed to collect one or more container logs.');
  }
}

try {
  run('pnpm', ['exec', 'playwright', 'install', 'chromium']);
  run('docker', [...composeArgs, 'up', '-d', '--build', '--wait']);
  try {
    run('pnpm', ['exec', 'playwright', 'test']);
  } catch (error) {
    saveLogs();
    throw error;
  }
} finally {
  cleanup();
}
