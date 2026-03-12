#!/usr/bin/env node
import { Command } from 'commander';
import Conf from 'conf';
import chalk from 'chalk';
import { loginSchema } from '@tracker/shared';

type Config = {
  host: string;
  token?: string;
  refreshToken?: string;
};

const config = new Conf<Config>({
  projectName: 'tracker-cli',
  defaults: {
    host: 'http://localhost:4000',
  },
});

async function api(path: string, init: RequestInit = {}) {
  const host = config.get('host');
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  let token = config.get('token');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(`${host}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && path !== '/auth/refresh') {
    const refreshToken = config.get('refreshToken');
    if (refreshToken) {
      const refreshResponse = await fetch(`${host}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshResponse.ok) {
        const refreshed = (await refreshResponse.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        config.set('token', refreshed.accessToken);
        config.set('refreshToken', refreshed.refreshToken);
        token = refreshed.accessToken;

        const retryHeaders = new Headers(init.headers);
        retryHeaders.set('Content-Type', 'application/json');
        retryHeaders.set('Authorization', `Bearer ${token}`);
        response = await fetch(`${host}${path}`, { ...init, headers: retryHeaders });
      }
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
}

const program = new Command();
program.name('tracker').description('Tracker CLI').version('0.1.0');

program
  .command('login')
  .requiredOption('--email <email>', 'email')
  .requiredOption('--password <password>', 'password')
  .action(async (options) => {
    const parsed = loginSchema.parse({ email: options.email, password: options.password });
    const response = (await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify(parsed),
    })) as { accessToken: string; refreshToken: string; email: string };
    config.set('token', response.accessToken);
    config.set('refreshToken', response.refreshToken);
    console.log(chalk.green(`Authenticated as ${response.email}`));
  });

program.command('logout').action(async () => {
  const refreshToken = config.get('refreshToken');
  if (refreshToken) {
    await api('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  config.delete('token');
  config.delete('refreshToken');
  console.log(chalk.yellow('Token cleared'));
});

const configCmd = program.command('config').description('Configuration commands');

configCmd
  .command('set-host')
  .argument('<host>', 'API host URL')
  .action((host: string) => {
    config.set('host', host);
    console.log(chalk.green(`Host set to ${host}`));
  });

configCmd.command('show').action(() => {
  console.log(
    JSON.stringify(
      {
        host: config.get('host'),
        authenticated: Boolean(config.get('token')),
        hasRefreshToken: Boolean(config.get('refreshToken')),
      },
      null,
      2,
    ),
  );
});

program
  .command('item:add')
  .requiredOption('--title <title>', 'Title')
  .option('--category <category>', 'Category', 'general')
  .action(async (options) => {
    const result = await api('/items', {
      method: 'POST',
      body: JSON.stringify({
        title: options.title,
        category: options.category,
        schedule: {
          kind: 'DAILY',
          dailyTimes: ['09:00'],
          timezone: 'UTC',
        },
      }),
    });
    console.log(chalk.green(`Item created: ${(result as { id: string }).id}`));
  });

program.command('items').action(async () => {
  const result = (await api('/items')) as Array<{ id: string; title: string; category: string }>;
  for (const item of result) {
    console.log(`${item.id} | ${item.title} | ${item.category}`);
  }
});

program.parseAsync(process.argv).catch((error) => {
  console.error(chalk.red(error.message));
  process.exit(1);
});
