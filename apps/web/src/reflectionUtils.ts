import type { RetrospectiveDraftKind, RetrospectiveEntry } from './appTypes';

export function cadenceLabel(cadence: 'daily' | 'weekly' | 'monthly') {
  if (cadence === 'daily') return 'Daily reflection';
  if (cadence === 'monthly') return 'Monthly reflection';
  return 'Weekly reflection';
}

export function cadenceWindowForDate(
  cadence: 'daily' | 'weekly' | 'monthly',
  now = new Date(),
): { start: string; end: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  if (cadence === 'daily') {
    start.setUTCDate(start.getUTCDate() - 1);
  } else if (cadence === 'monthly') {
    start.setUTCDate(start.getUTCDate() - 30);
  } else {
    start.setUTCDate(start.getUTCDate() - 7);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export function scheduledReflectionDue(
  cadence: 'daily' | 'weekly' | 'monthly',
  latestScheduled: RetrospectiveEntry | null,
  now = new Date(),
) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (!latestScheduled) return true;
  const next = new Date(latestScheduled.periodEnd);
  if (cadence === 'daily') next.setUTCDate(next.getUTCDate() + 1);
  else if (cadence === 'monthly') next.setUTCDate(next.getUTCDate() + 30);
  else next.setUTCDate(next.getUTCDate() + 7);
  return next.getTime() <= today;
}

export function buildReflectionDraftPath(subject: {
  id: string;
  name: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  retrospectives: RetrospectiveEntry[];
}) {
  const latestScheduled =
    subject.retrospectives
      .filter((entry) => entry.kind === 'scheduled')
      .sort((left, right) => right.periodEnd.localeCompare(left.periodEnd))[0] ?? null;
  const kind: RetrospectiveDraftKind = scheduledReflectionDue(subject.cadence, latestScheduled) ? 'scheduled' : 'manual';
  const params = new URLSearchParams({
    subject: subject.id,
    kind,
  });
  return `/retrospectives/new?${params.toString()}`;
}
