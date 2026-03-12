import { Command } from 'commander';
import { $ } from 'zx';

type Item = {
  id: string;
  title: string;
  notificationEnabled: boolean;
  notificationHardToDismiss: boolean;
  notificationRepeatMinutes: number;
};

const program = new Command();
program
  .requiredOption('--host <host>', 'API host', 'http://localhost:4000')
  .requiredOption('--token <token>', 'JWT access token')
  .option('--interval-seconds <seconds>', 'Polling interval', '60')
  .parse(process.argv);

const options = program.opts<{
  host: string;
  token: string;
  intervalSeconds: string;
}>();

const acked = new Set<string>();

async function notify(item: Item): Promise<void> {
  const title = `Tracker: ${item.title}`;
  const message = item.notificationHardToDismiss
    ? 'Action needed. This will repeat until completed.'
    : 'Scheduled reminder';

  await $`terminal-notifier -title ${title} -message ${message} -group ${item.id}`;
}

async function loop(): Promise<void> {
  const response = await fetch(`${options.host}/items`, {
    headers: {
      Authorization: `Bearer ${options.token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch items: ${response.status}`);
  }

  const items = (await response.json()) as Item[];
  for (const item of items) {
    if (!item.notificationEnabled) continue;
    if (acked.has(item.id) && !item.notificationHardToDismiss) continue;

    await notify(item);
    if (!item.notificationHardToDismiss) {
      acked.add(item.id);
    }
  }
}

const intervalMs = Number(options.intervalSeconds) * 1000;
setInterval(() => {
  loop().catch((error) => {
    console.error(error);
  });
}, intervalMs);

loop().catch((error) => {
  console.error(error);
  process.exit(1);
});
