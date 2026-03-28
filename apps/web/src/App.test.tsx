import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChakraProvider } from '@chakra-ui/react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { Item, RetrospectiveEntry } from './appTypes';

const { apiFetchMock, getTokenMock, setTokenMock, setRefreshTokenMock, clearTokenMock, tokenState } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  getTokenMock: vi.fn(),
  setTokenMock: vi.fn(),
  setRefreshTokenMock: vi.fn(),
  clearTokenMock: vi.fn(),
  tokenState: { value: 'token' as string | null },
}));

vi.mock('./api', () => ({
  apiFetch: apiFetchMock,
  clearToken: clearTokenMock,
  getToken: getTokenMock,
  setRefreshToken: setRefreshTokenMock,
  setToken: setTokenMock,
}));

type MeResponse = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  weeklyDigestDay: number;
  weeklyDigestHour: number;
  reflectionCadence: 'daily' | 'weekly' | 'monthly';
  reflectionWeekday: number;
  reflectionMonthDay: number;
  roles: Array<{ role: string }>;
  members: Array<{
    mode?: 'active' | 'passive';
    canActOnItems?: boolean;
    canManageRoutines?: boolean;
    canManageFollowThrough?: boolean;
    historyWindow?: string;
    hiddenItemCount?: number;
    member: { id: string; email: string; name: string };
  }>;
  guides: Array<{
    mode?: 'active' | 'passive';
    canActOnItems?: boolean;
    canManageRoutines?: boolean;
    canManageFollowThrough?: boolean;
    historyWindow?: string;
    hiddenItemCount?: number;
    guide: { id: string; email: string; name: string };
  }>;
};

const meResponse: MeResponse = {
  id: 'u1',
  email: 'user@example.com',
  name: 'User',
  avatarUrl: null,
  timezone: 'UTC',
  weeklyDigestDay: 1,
  weeklyDigestHour: 8,
  reflectionCadence: 'weekly',
  reflectionWeekday: 0,
  reflectionMonthDay: 1,
  roles: [{ role: 'USER' }],
  members: [],
  guides: [],
};

function mockAuthedApi(overrides: Partial<MeResponse> = {}) {
  const response = { ...meResponse, ...overrides };
  tokenState.value = 'token';
  apiFetchMock.mockImplementation(async (path: string) => {
    if (path === '/setup/status') return { needsSetup: false };
    if (path === '/auth/oauth/options') return { providers: [] };
    if (path === '/me') return response;
    if (path === '/items') return [];
    if (path === '/members') return [];
    if (path === '/history/audit') return [];
    if (path === '/retrospectives') return [];
    if (path === '/admin/users') return [];
    throw new Error(`Unexpected api path: ${path}`);
  });
}

function renderApp(initialPath = '/dashboard') {
  return render(
    <ChakraProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

describe('App routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    tokenState.value = 'token';
    getTokenMock.mockImplementation(() => tokenState.value);
    setTokenMock.mockImplementation((nextToken: string) => {
      tokenState.value = nextToken;
    });
    clearTokenMock.mockImplementation(() => {
      tokenState.value = null;
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    mockAuthedApi();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders routines page directly without crashing', async () => {
    renderApp('/routines');

    expect((await screen.findAllByRole('heading', { name: 'Routines' })).length).toBeGreaterThan(0);
    expect(screen.getByText('1. Start from a template or scratch')).toBeInTheDocument();
  });

  it('opens the mailbox inbox from the header and shows feed entries', async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/me') {
        return {
          ...meResponse,
          members: [{ member: { id: 'u2', email: 'member@example.com', name: 'Alex' } }],
        };
      }
      if (path === '/items') {
        return [
          {
            id: 'i1',
            title: 'Morning meds',
            category: 'health',
            scheduleKind: 'DAILY',
            scheduleData: { kind: 'DAILY', dailyTimes: ['08:00'] },
            notificationEnabled: true,
            notificationHardToDismiss: true,
            notificationRepeatMinutes: 10,
            createdAt: '2026-03-10T08:00:00.000Z',
            updatedAt: '2026-03-12T08:00:00.000Z',
          },
        ];
      }
      if (path === '/members') {
        return [
          {
            member: {
              id: 'u2',
              email: 'member@example.com',
              name: 'Alex',
              reflectionCadence: 'weekly',
              reflectionWeekday: 0,
              reflectionMonthDay: 1,
            },
            relationship: {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days and upcoming items',
              hiddenItemCount: 1,
            },
            items: [
              {
                id: 'ri1',
                title: 'Speech practice',
                category: 'exercise',
                scheduleKind: 'ONE_TIME',
                scheduleData: { kind: 'ONE_TIME', oneTimeAt: '2026-03-12T08:00:00.000Z' },
                completions: [
                  {
                    id: 'c1',
                    occurredAt: '2026-03-11T08:00:00.000Z',
                    note: 'Completed before dinner',
                  },
                ],
              },
            ],
          },
        ];
      }
      if (path === '/history/audit') return [];
      if (path === '/retrospectives') return [];
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/dashboard');

    await screen.findAllByRole('heading', { name: 'Overview' });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open notifications inbox' }));

    const mailbox = await screen.findByTestId('notification-mailbox');
    expect(within(mailbox).getByText('Inbox')).toBeInTheDocument();
    expect(within(mailbox).getAllByText('Guide update').length).toBeGreaterThan(0);
    expect(
      within(mailbox).getByText('1 routine can raise member alerts. Digest timing stays under Profile & Relationships.'),
    ).toBeInTheDocument();
    expect(within(mailbox).getByText('Completed before dinner')).toBeInTheDocument();
    expect(within(mailbox).getByText('Open Profile')).toBeInTheDocument();
  });

  it('navigates from dashboard to my items', async () => {
    renderApp('/dashboard');
    expect((await screen.findAllByRole('heading', { name: 'Overview' })).length).toBeGreaterThan(0);

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('link', { name: /My Items/i })[0]!);

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'My Items' }).length).toBeGreaterThan(0);
    });
  });

  it('shows an intentional empty mailbox state when no updates exist yet', async () => {
    renderApp('/dashboard');

    await screen.findAllByRole('heading', { name: 'Overview' });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open notifications inbox' }));

    const mailbox = await screen.findByTestId('notification-mailbox');
    expect(within(mailbox).getByText('No notifications')).toBeInTheDocument();
    expect(within(mailbox).getByText('Everything is caught up right now.')).toBeInTheDocument();
  });

  it('renders the members workspace for guide users and hides operational controls for passive relationships', async () => {
    mockAuthedApi({
      members: [{ member: { id: 'u2', email: 'member@example.com', name: 'Alex' } }],
    });
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/me') {
        return {
          ...meResponse,
          members: [{ member: { id: 'u2', email: 'member@example.com', name: 'Alex' } }],
        };
      }
      if (path === '/items') return [];
      if (path === '/members') {
        return [
          {
            member: {
              id: 'u2',
              email: 'member@example.com',
              name: 'Alex',
              reflectionCadence: 'weekly',
              reflectionWeekday: 0,
              reflectionMonthDay: 1,
            },
            relationship: {
              mode: 'passive',
              canActOnItems: false,
              canManageRoutines: false,
              canManageFollowThrough: false,
              historyWindow: 'Future only',
              hiddenItemCount: 0,
            },
            items: [
              {
                id: 'i1',
                title: 'Morning meds',
                category: 'health',
                scheduleKind: 'ONE_TIME',
                scheduleData: { kind: 'ONE_TIME', oneTimeAt: '2026-03-12T08:00:00.000Z' },
                completions: [
                  {
                    id: 'c1',
                    occurredAt: '2026-03-11T08:00:00.000Z',
                    note: 'Handled early',
                  },
                ],
              },
            ],
          },
        ];
      }
      if (path === '/history/audit') return [];
      if (path === '/retrospectives') {
        return [
          {
            id: 'r_member_1',
            subjectUserId: 'u2',
            kind: 'scheduled',
            title: 'Weekly reflection · Alex',
            subjectName: 'Alex',
            periodStart: '2026-03-07T00:00:00.000Z',
            periodEnd: '2026-03-14T00:00:00.000Z',
            audience: 'Alex and User',
            visibility: 'Visible while the relationship history window still includes this period.',
            createdAt: '2026-03-13T11:00:00.000Z',
            createdByName: 'Alex',
            summary: 'A steady week.',
            promptPreset: 'weekly-review',
            prompts: ['What went well?'],
            viewerRole: 'guide',
            canContribute: false,
            contributions: [],
          },
        ];
      }
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/members');

    expect((await screen.findAllByRole('heading', { name: 'Members' })).length).toBeGreaterThan(0);
    expect(screen.getByText('Weekly reflection · Alex')).toBeInTheDocument();
    expect(screen.getAllByText('Observation only').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Guide-visible only\./).length).toBeGreaterThan(0);
    expect(screen.getAllByText('This score only reflects items shared in this relationship.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Manage routines' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Impromptu Reflection' })).not.toBeInTheDocument();
  });

  it('lets an active guide act on a member occurrence and shows the attribution afterward', async () => {
    const now = new Date();
    const dueTarget = new Date(now);
    dueTarget.setHours(8, 0, 0, 0);
    const dueTargetIso = dueTarget.toISOString();
    let memberActionNote: string | null = null;

    mockAuthedApi({
      members: [{ member: { id: 'u2', email: 'member@example.com', name: 'Alex' } }],
    });
    apiFetchMock.mockImplementation(async (path: string, options?: { method?: string; body?: string }) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/me') {
        return {
          ...meResponse,
          members: [{ member: { id: 'u2', email: 'member@example.com', name: 'Alex' } }],
        };
      }
      if (path === '/items') return [];
      if (path === '/members') {
        return [
          {
            member: {
              id: 'u2',
              email: 'member@example.com',
              name: 'Alex',
              reflectionCadence: 'weekly',
              reflectionWeekday: 0,
              reflectionMonthDay: 1,
            },
            relationship: {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days and upcoming items',
              hiddenItemCount: 0,
            },
            items: [
              {
                id: 'ri1',
                title: 'Evening stretch',
                category: 'exercise',
                scheduleKind: 'DAILY',
                scheduleData: { kind: 'DAILY', dailyTimes: ['08:00'] },
                completions: [],
                actions: memberActionNote
                  ? [
                      {
                        id: 'act_1',
                        kind: 'note',
                        occurredAt: new Date(now.getTime() + 60_000).toISOString(),
                        targetAt: dueTargetIso,
                        note: memberActionNote,
                        actorName: 'User',
                      },
                    ]
                  : [],
              },
            ],
          },
        ];
      }
      if (path === '/members/u2/items/ri1/actions') {
        memberActionNote = JSON.parse(options?.body ?? '{}').note ?? null;
        return { id: 'act_1' };
      }
      if (path === '/history/audit') return [];
      if (path === '/retrospectives') return [];
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/members');

    await screen.findAllByRole('heading', { name: 'Members' });

    const user = userEvent.setup();
    await user.clear(screen.getByRole('textbox', { name: 'Support note for Evening stretch' }));
    await user.type(screen.getByRole('textbox', { name: 'Support note for Evening stretch' }), 'Guide follow-up note');
    await user.click(screen.getByRole('button', { name: 'Save note for Evening stretch for u2' }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        '/members/u2/items/ri1/actions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            kind: 'note',
            targetAt: dueTargetIso,
            note: 'Guide follow-up note',
          }),
        }),
      );
    });

    expect(await screen.findByText(/Current note · User/)).toBeInTheDocument();
    expect(screen.getAllByText('Guide follow-up note').length).toBeGreaterThan(0);
    expect(screen.getByText('User recorded this update.')).toBeInTheDocument();
  });

  it('shows member actions, guide attention, and next review on the dashboard for dual-role users', async () => {
    mockAuthedApi({
      members: [{ member: { id: 'u2', email: 'member@example.com', name: 'Alex' } }],
      guides: [{ guide: { id: 'u3', email: 'guide@example.com', name: 'Jordan' } }],
    });
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/me') {
        return {
          ...meResponse,
          members: [{ member: { id: 'u2', email: 'member@example.com', name: 'Alex' } }],
          guides: [{ guide: { id: 'u3', email: 'guide@example.com', name: 'Jordan' } }],
        };
      }
      if (path === '/items') {
        return [
          {
            id: 'i1',
            title: 'Morning meds',
            category: 'health',
            scheduleKind: 'DAILY',
            scheduleData: { kind: 'DAILY', dailyTimes: ['08:00'] },
          },
        ];
      }
      if (path === '/members') {
        return [
          {
            member: {
              id: 'u2',
              email: 'member@example.com',
              name: 'Alex',
              reflectionCadence: 'weekly',
              reflectionWeekday: 0,
              reflectionMonthDay: 1,
            },
            relationship: {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days and upcoming items',
              hiddenItemCount: 1,
            },
            items: [
              {
                id: 'ri1',
                title: 'Evening stretch',
                category: 'exercise',
                scheduleKind: 'ONE_TIME',
                scheduleData: { kind: 'ONE_TIME', oneTimeAt: '2026-03-12T08:00:00.000Z' },
                completions: [
                  {
                    id: 'c1',
                    occurredAt: '2026-03-11T08:00:00.000Z',
                    note: 'Finished before work',
                  },
                ],
              },
            ],
          },
        ];
      }
      if (path === '/history/audit') return [];
      if (path === '/retrospectives') return [];
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/dashboard');

    await screen.findAllByRole('heading', { name: 'Overview' });
    expect(screen.getByRole('heading', { name: 'Member Actions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Guide Attention' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Next Review' })).toBeInTheDocument();
    expect(screen.getByText('You have both member and guide work to review')).toBeInTheDocument();
    expect(screen.getByText('Recent Shared Completions')).toBeInTheDocument();
    expect(screen.getAllByText(/% accountability/).length).toBeGreaterThan(0);
    expect(screen.getByText('Some items are hidden from this view.')).toBeInTheDocument();
  });

  it('keeps preferences and admin out of the main app navigation', async () => {
    renderApp('/dashboard');

    await screen.findAllByRole('heading', { name: 'Overview' });
    expect(screen.queryByRole('link', { name: 'Profile & Relationships' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Looking Back' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Audit Log' })).not.toBeInTheDocument();
  });

  it('enters account mode from the user menu and offers a return path', async () => {
    renderApp('/dashboard');

    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: 'Open account menu' }))[0]!);
    const openedMenu = (await screen.findAllByTestId('account-menu'))[0]!;
    await user.click(within(openedMenu).getByText('Profile & Relationships'));

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Profile & Relationships' }).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('link', { name: 'Back to app' })).toBeInTheDocument();
  });

  it('renders looking back as an app surface and audit log as an account surface', async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/me') {
        return {
          ...meResponse,
          members: [
            {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days + next due',
              hiddenItemCount: 1,
              createdAt: '2026-03-10T08:00:00.000Z',
              member: { id: 'u2', email: 'member@example.com', name: 'Alex' },
            },
          ],
          guides: [
            {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days + next due',
              hiddenItemCount: 0,
              createdAt: '2026-03-09T08:00:00.000Z',
              guide: { id: 'u3', email: 'guide@example.com', name: 'Jordan' },
            },
          ],
        };
      }
      if (path === '/items') {
        return [
          {
            id: 'i1',
            title: 'Morning meds',
            category: 'health',
            scheduleKind: 'DAILY',
            scheduleData: { kind: 'DAILY', dailyTimes: ['08:00'] },
            createdAt: '2026-03-10T08:00:00.000Z',
            completions: [
              {
                id: 'c1',
                occurredAt: '2026-03-13T08:00:00.000Z',
                note: 'Handled before breakfast',
              },
            ],
          },
        ];
      }
      if (path === '/members') {
        return [
          {
            member: {
              id: 'u2',
              email: 'member@example.com',
              name: 'Alex',
              reflectionCadence: 'weekly',
              reflectionWeekday: 0,
              reflectionMonthDay: 1,
            },
            relationship: {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days + next due',
              hiddenItemCount: 1,
              createdAt: '2026-03-10T08:00:00.000Z',
            },
            items: [
              {
                id: 'ri1',
                title: 'Speech practice',
                category: 'exercise',
                scheduleKind: 'INTERVAL_DAYS',
                scheduleData: {
                  kind: 'INTERVAL_DAYS',
                  intervalDays: 2,
                  intervalAnchor: '2026-03-09T08:00:00.000Z',
                },
                createdAt: '2026-03-10T08:00:00.000Z',
                completions: [
                  {
                    id: 'rc1',
                    occurredAt: '2026-03-13T09:00:00.000Z',
                    note: 'Focused session',
                  },
                ],
              },
            ],
          },
        ];
      }
      if (path === '/history/audit') {
        return [
          {
            id: 'a1',
            occurredAt: '2026-03-13T09:00:00.000Z',
            category: 'relationship',
            scope: 'member',
            subjectName: 'Alex',
            title: 'Guide relationship started with Alex',
            detail: 'Alex is connected as an active relationship with explicit history boundaries.',
            actorName: 'User',
            visibility: 'Visible because Alex is in your guide workspace.',
          },
        ];
      }
      if (path === '/retrospectives') {
        return [
          {
            id: 'r1',
            subjectUserId: 'u1',
            kind: 'scheduled',
            title: 'Weekly reflection · User',
            subjectName: 'User',
            periodStart: '2026-03-07T00:00:00.000Z',
            periodEnd: '2026-03-14T00:00:00.000Z',
            audience: 'User and Jordan',
            visibility: 'Visible to permitted guides whose relationship history includes this period.',
            createdAt: '2026-03-13T10:00:00.000Z',
            createdByName: 'User',
            summary: 'A solid week overall.',
            promptPreset: 'weekly-review',
            prompts: ['What went well?', 'What was harder?', 'What changes next?'],
            viewerRole: 'member',
            canContribute: true,
            contributions: [
              {
                id: 'rc1',
                body: 'Handled before breakfast.',
                createdAt: '2026-03-13T10:10:00.000Z',
                authorName: 'User',
                authorRole: 'member',
              },
            ],
          },
          {
            id: 'r2',
            subjectUserId: 'u2',
            kind: 'manual',
            title: 'Impromptu Reflection · Alex',
            subjectName: 'Alex',
            periodStart: '2026-03-10T00:00:00.000Z',
            periodEnd: '2026-03-13T00:00:00.000Z',
            audience: 'Alex and User',
            visibility: 'Visible while the relationship history window still includes this period.',
            createdAt: '2026-03-13T11:00:00.000Z',
            createdByName: 'User',
            summary: 'This was a short reset after a rough couple of days.',
            promptPreset: 'reset-and-obstacles',
            prompts: ['What blocked Alex?', 'What reset is realistic?', 'What support helps next?'],
            viewerRole: 'guide',
            canContribute: true,
            contributions: [],
          },
        ];
      }
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/retrospectives');

    expect((await screen.findAllByRole('heading', { name: 'Looking Back' })).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Weekly reflection · User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Impromptu Reflection · Alex').length).toBeGreaterThan(0);

    cleanup();

    renderApp('/audit-log');

    expect((await screen.findAllByRole('heading', { name: 'Audit Log' })).length).toBeGreaterThan(0);
    expect(screen.getByText('Attributed account and relationship history')).toBeInTheDocument();
    expect(screen.getByText('Guide relationship started with Alex')).toBeInTheDocument();
  });

  it('opens a due scheduled reflection draft from my items and creates it', async () => {
    let retrospectives: RetrospectiveEntry[] = [];

    apiFetchMock.mockImplementation(async (path: string, options?: { method?: string; body?: string }) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/me') {
        return {
          ...meResponse,
          guides: [
            {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days + next due',
              hiddenItemCount: 0,
              guide: { id: 'u3', email: 'guide@example.com', name: 'Jordan' },
            },
          ],
        };
      }
      if (path === '/items') {
        return [
          {
            id: 'i1',
            title: 'Morning meds',
            category: 'health',
            scheduleKind: 'DAILY',
            scheduleData: { kind: 'DAILY', dailyTimes: ['08:00'] },
            createdAt: '2026-03-10T08:00:00.000Z',
            updatedAt: '2026-03-12T08:00:00.000Z',
          },
        ];
      }
      if (path === '/members') return [];
      if (path === '/history/audit') return [];
      if (path === '/retrospectives' && !options?.method) return retrospectives;
      if (path === '/retrospectives' && options?.method === 'POST') {
        const body = JSON.parse(options.body ?? '{}');
        const created: RetrospectiveEntry = {
          id: 'r_new',
          subjectUserId: body.subjectUserId,
          kind: body.kind,
          title: body.title,
          subjectName: 'User',
          periodStart: body.periodStart,
          periodEnd: body.periodEnd,
          audience: 'User and Jordan',
          visibility: 'Visible to permitted guides whose relationship history includes this period.',
          createdAt: '2026-03-14T12:00:00.000Z',
          createdByName: 'User',
          summary: body.summary,
          promptPreset: body.promptPreset,
          prompts: ['What went well?', 'What was harder?', 'What changes next?'],
          viewerRole: 'member',
          canContribute: true,
          contributions: [],
        };
        retrospectives = [created];
        return created;
      }
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/my-items');

    const user = userEvent.setup();
    await screen.findAllByRole('heading', { name: 'My Items' });
    await user.click(screen.getByRole('link', { name: 'Open reflection for myself' }));

    expect(await screen.findByRole('heading', { name: 'Scheduled Look Back for Myself' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Reflection type')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Reflection title')).not.toBeInTheDocument();
    expect(screen.getByText('Scheduled period')).toBeInTheDocument();
    expect(screen.getByText('Writing prompt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Writing Prompt' })).toBeInTheDocument();
    expect(screen.queryByText('Search and browse old reflections, then open the one you want to review.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Looking Back' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create Reflection' }));

    expect(await screen.findByLabelText('Summary for Weekly reflection · User')).toBeInTheDocument();
    expect(await screen.findByText('Created by User for User and Jordan')).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/retrospectives',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('works the my items queue with inline note and completion actions', async () => {
    let items: Item[] = [
      {
        id: 'i1',
        title: 'Morning meds',
        category: 'health',
        scheduleKind: 'DAILY',
        scheduleData: { kind: 'DAILY', dailyTimes: ['08:00'] },
        completions: [],
        actions: [],
        createdAt: '2026-03-10T08:00:00.000Z',
        updatedAt: '2026-03-12T08:00:00.000Z',
      },
      {
        id: 'i2',
        title: 'Upload tax packet',
        category: 'paperwork',
        scheduleKind: 'ONE_TIME',
        scheduleData: { kind: 'ONE_TIME', oneTimeAt: '2099-04-01T16:00:00.000Z', timezone: 'UTC' },
        completions: [],
        actions: [],
        createdAt: '2026-03-10T08:00:00.000Z',
        updatedAt: '2026-03-12T08:00:00.000Z',
      },
    ];

    apiFetchMock.mockImplementation(async (path: string, options?: { method?: string; body?: string }) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/me') return meResponse;
      if (path === '/items') return items;
      if (path === '/members') return [];
      if (path === '/history/audit') return [];
      if (path === '/retrospectives') return [];
      if (path === '/admin/users') return [];
      if (path === '/items/i1/actions' && options?.method === 'POST') {
        const body = JSON.parse(options.body ?? '{}');
        if (body.kind === 'note') {
          items = items.map((item) =>
            item.id === 'i1'
              ? {
                  ...item,
                  actions: [
                    {
                      id: 'a1',
                      kind: 'note',
                      occurredAt: '2026-03-28T09:00:00.000Z',
                      targetAt: body.targetAt,
                      note: body.note,
                    },
                  ],
                }
              : item,
          );
          return { id: 'a1' };
        }

        if (body.kind === 'complete') {
          items = items.map((item) =>
            item.id === 'i1'
              ? {
                  ...item,
                  completions: [
                    {
                      id: 'c1',
                      occurredAt: '2026-03-28T09:05:00.000Z',
                      targetAt: body.targetAt,
                      note: body.note,
                    },
                  ],
                  actions: item.actions,
                }
              : item,
          );
          return { id: 'c1' };
        }
      }
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/my-items');

    const user = userEvent.setup();
    await screen.findAllByRole('heading', { name: 'My Items' });
    expect(screen.getByRole('heading', { name: 'Now' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upcoming One-Time Work' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Occurrence note for Morning meds'), 'Take with breakfast');
    await user.click(screen.getByRole('button', { name: 'Save note for Morning meds' }));

    expect(await screen.findByText('Current note')).toBeInTheDocument();
    expect(screen.getAllByText('Take with breakfast').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Complete Morning meds' }));

    await waitFor(() => {
      expect(screen.getByText('Nothing is due right now.')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Upload tax packet').length).toBeGreaterThan(0);
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/items/i1/actions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('opens a reflection from looking back and updates its summary and notes on the detail page', async () => {
    let retrospectives: RetrospectiveEntry[] = [
      {
        id: 'r2',
        subjectUserId: 'u2',
        kind: 'manual',
        title: 'Impromptu Reflection · Alex',
        subjectName: 'Alex',
        periodStart: '2026-03-10T00:00:00.000Z',
        periodEnd: '2026-03-14T00:00:00.000Z',
        audience: 'Alex and User',
        visibility: 'Visible while the relationship history window still includes this period.',
        createdAt: '2026-03-14T01:00:00.000Z',
        createdByName: 'User',
        summary: 'Shorter sessions should be easier to restart.',
        promptPreset: 'support-check-in',
        prompts: ['What support helped most?', 'What slipped?', 'What changes next?'],
        viewerRole: 'guide',
        canContribute: true,
        contributions: [],
      },
      {
        id: 'r1',
        subjectUserId: 'u1',
        kind: 'scheduled',
        title: 'Weekly reflection · User',
        subjectName: 'User',
        periodStart: '2026-03-07T00:00:00.000Z',
        periodEnd: '2026-03-14T00:00:00.000Z',
        audience: 'User and Jordan',
        visibility: 'Visible to permitted guides whose relationship history includes this period.',
        createdAt: '2026-03-13T10:00:00.000Z',
        createdByName: 'User',
        summary: 'A solid week overall.',
        promptPreset: 'weekly-review',
        prompts: ['What went well?', 'What was harder?', 'What changes next?'],
        viewerRole: 'member' as const,
        canContribute: true,
        contributions: [],
      },
    ];

    apiFetchMock.mockImplementation(async (path: string, options?: { method?: string; body?: string }) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/me') {
        return {
          ...meResponse,
          guides: [
            {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days + next due',
              hiddenItemCount: 0,
              guide: { id: 'u3', email: 'guide@example.com', name: 'Jordan' },
            },
          ],
          members: [
            {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days + next due',
              hiddenItemCount: 0,
              member: { id: 'u2', email: 'member@example.com', name: 'Alex' },
            },
          ],
        };
      }
      if (path === '/items') return [];
      if (path === '/members') return [];
      if (path === '/history/audit') return [];
      if (path === '/retrospectives' && !options?.method) return retrospectives;
      if (path === '/retrospectives' && options?.method === 'POST') throw new Error('Unexpected create call');
      if (path === '/retrospectives/r2' && options?.method === 'PATCH') {
        retrospectives = retrospectives.map((entry) =>
          entry.id === 'r2'
            ? {
                ...entry,
                summary: 'Updated summary after review.',
              }
            : entry,
        );
        return retrospectives.find((entry) => entry.id === 'r2');
      }
      if (path === '/retrospectives/r2/contributions') {
        retrospectives = retrospectives.map((entry) =>
          entry.id === 'r2'
            ? {
                ...entry,
                contributions: [
                  ...entry.contributions,
                  {
                    id: 'note_2',
                    body: 'Alex agreed to move practice earlier.',
                    createdAt: '2026-03-14T01:10:00.000Z',
                    authorName: 'User',
                    authorRole: 'guide' as const,
                  },
                ],
              }
            : entry,
        );
        return retrospectives.find((entry) => entry.id === 'r2');
      }
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/retrospectives');

    const user = userEvent.setup();
    await screen.findAllByRole('heading', { name: 'Looking Back' });
    await user.click(screen.getByRole('link', { name: /Impromptu Reflection · Alex/i }));

    fireEvent.change(await screen.findByLabelText('Summary for Impromptu Reflection · Alex'), {
      target: { value: 'Updated summary after review.' },
    });
    await user.click(screen.getAllByRole('button', { name: 'Save Summary' })[0]!);

    await waitFor(() => {
      expect(screen.getAllByDisplayValue('Updated summary after review.').length).toBeGreaterThan(0);
    });
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/retrospectives/r2',
      expect.objectContaining({ method: 'PATCH' }),
    );

    fireEvent.change(screen.getByLabelText('Add note for Impromptu Reflection · Alex'), {
      target: { value: 'Alex agreed to move practice earlier.' },
    });
    await user.click(screen.getAllByRole('button', { name: 'Save Note' })[0]!);

    await screen.findByText('Alex agreed to move practice earlier.');
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/retrospectives/r2/contributions',
      expect.objectContaining({ method: 'POST' }),
    );
  }, 10000);

  it('filters looking back entries by date range overlap', async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/me') {
        return {
          ...meResponse,
          members: [
            {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days + next due',
              hiddenItemCount: 0,
              member: { id: 'u2', email: 'member@example.com', name: 'Alex' },
            },
          ],
        };
      }
      if (path === '/items') return [];
      if (path === '/members') return [];
      if (path === '/history/audit') return [];
      if (path === '/retrospectives') {
        return [
          {
            id: 'r1',
            subjectUserId: 'u1',
            kind: 'scheduled',
            title: 'Weekly reflection · User',
            subjectName: 'User',
            periodStart: '2026-03-01T00:00:00.000Z',
            periodEnd: '2026-03-08T00:00:00.000Z',
            audience: 'User and Jordan',
            visibility: 'Visible to permitted guides whose relationship history includes this period.',
            createdAt: '2026-03-08T10:00:00.000Z',
            createdByName: 'User',
            summary: 'A solid week overall.',
            promptPreset: 'weekly-review',
            prompts: ['What went well?', 'What was harder?', 'What changes next?'],
            viewerRole: 'member',
            canContribute: true,
            contributions: [],
          },
          {
            id: 'r2',
            subjectUserId: 'u2',
            kind: 'manual',
            title: 'Impromptu Reflection · Alex',
            subjectName: 'Alex',
            periodStart: '2026-03-10T00:00:00.000Z',
            periodEnd: '2026-03-13T00:00:00.000Z',
            audience: 'Alex and User',
            visibility: 'Visible while the relationship history window still includes this period.',
            createdAt: '2026-03-13T11:00:00.000Z',
            createdByName: 'User',
            summary: 'This was a short reset after a rough couple of days.',
            promptPreset: 'reset-and-obstacles',
            prompts: ['What blocked Alex?', 'What reset is realistic?', 'What support helps next?'],
            viewerRole: 'guide',
            canContribute: true,
            contributions: [],
          },
          {
            id: 'r3',
            subjectUserId: 'u2',
            kind: 'scheduled',
            title: 'Weekly reflection · Alex',
            subjectName: 'Alex',
            periodStart: '2026-03-14T00:00:00.000Z',
            periodEnd: '2026-03-21T00:00:00.000Z',
            audience: 'Alex and User',
            visibility: 'Visible while the relationship history window still includes this period.',
            createdAt: '2026-03-21T11:00:00.000Z',
            createdByName: 'User',
            summary: 'Planning ahead helped.',
            promptPreset: 'weekly-review',
            prompts: ['What went well?', 'What changed next?'],
            viewerRole: 'guide',
            canContribute: true,
            contributions: [],
          },
        ] satisfies RetrospectiveEntry[];
      }
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/retrospectives');

    await screen.findAllByRole('heading', { name: 'Looking Back' });
    expect(screen.getByText('Weekly reflection · User')).toBeInTheDocument();
    expect(screen.getByText('Impromptu Reflection · Alex')).toBeInTheDocument();
    expect(screen.getByText('Weekly reflection · Alex')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-03-09' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-03-13' } });

    expect(screen.queryByText('Weekly reflection · User')).not.toBeInTheDocument();
    expect(screen.getByText('Impromptu Reflection · Alex')).toBeInTheDocument();
    expect(screen.queryByText('Weekly reflection · Alex')).not.toBeInTheDocument();
    expect(screen.queryByText('No reflections match the current filters.')).not.toBeInTheDocument();
  });

  it('shows relationship permissions and visibility details on the profile page', async () => {
    mockAuthedApi({
      guides: [
        {
          mode: 'active',
          canActOnItems: true,
          canManageRoutines: true,
          canManageFollowThrough: true,
          historyWindow: 'Last 30 days + next due',
          hiddenItemCount: 1,
          guide: { id: 'u3', email: 'guide@example.com', name: 'Jordan' },
        },
      ],
      members: [
        {
          mode: 'passive',
          canActOnItems: false,
          canManageRoutines: false,
          canManageFollowThrough: false,
          historyWindow: 'Future only',
          hiddenItemCount: 0,
          member: { id: 'u2', email: 'member@example.com', name: 'Alex' },
        },
      ],
    });

    renderApp('/profile');

    await screen.findAllByRole('heading', { name: 'Profile & Relationships' });
    expect(screen.getByRole('heading', { name: 'Relationship Setup' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Looking Back Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Looking Back Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Notification Preferences' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Notification Preferences' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Active Guide/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your Guides' })).toBeInTheDocument();
    expect(screen.getByText('Jordan')).toBeInTheDocument();
    expect(screen.getByText("1 hidden item stays outside this guide's view.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your Members' })).toBeInTheDocument();
  });

  it('updates the account menu immediately after saving profile changes', async () => {
    apiFetchMock.mockImplementation(async (path: string, options?: { body?: string }) => {
      if (path === '/me') return meResponse;
      if (path === '/items') return [];
      if (path === '/history/audit') return [];
      if (path === '/retrospectives') return [];
      if (path === '/me/preferences') {
        expect(JSON.parse(options?.body ?? '{}')).toMatchObject({ name: 'Updated User' });
        return { ...meResponse, name: 'Updated User', avatarUrl: null };
      }
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/profile');

    const user = userEvent.setup();
    const nameInput = await screen.findByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated User');
    await user.click(screen.getByRole('button', { name: 'Save Profile' }));

    await user.click((await screen.findAllByRole('button', { name: 'Open account menu' }))[0]!);
    const menu = await screen.findByTestId('account-menu');
    expect(within(menu).getByText('Updated User')).toBeInTheDocument();
  });

  it('submits login when pressing Enter in the password field', async () => {
    tokenState.value = null;
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/auth/login') return { accessToken: 'token', refreshToken: 'refresh' };
      if (path === '/me') return meResponse;
      if (path === '/items') return [];
      if (path === '/history/audit') return [];
      if (path === '/retrospectives') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/dashboard');

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret{Enter}');

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('marks the login fields with browser autofill hints', async () => {
    tokenState.value = null;
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/dashboard');

    const emailInput = await screen.findByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('name', 'username');
    expect(emailInput).toHaveAttribute('autocomplete', 'username');
    expect(emailInput).toHaveAttribute('id', 'login-email');
    expect(passwordInput).toHaveAttribute('name', 'password');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    expect(passwordInput).toHaveAttribute('id', 'login-password');
  });

  it('marks the first-run setup fields with browser autofill hints', async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const authPageSource = readFileSync(resolve(here, 'pages/AuthPage.tsx'), 'utf8');

    expect(authPageSource).toContain('id="setup-email"');
    expect(authPageSource).toContain('autoComplete="email"');
    expect(authPageSource).toContain('id="setup-password"');
    expect(authPageSource).toContain('autoComplete="new-password"');
  });

  it('shows the first-run setup form with a real demo mode checkbox', async () => {
    tokenState.value = null;
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/setup/status') return { needsSetup: true };
      if (path === '/auth/oauth/options') return { providers: [] };
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Create your workspace' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Enable demo mode' })).toBeInTheDocument();
  });

  it('prefills the first-run setup token from the URL when present', async () => {
    tokenState.value = null;
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/setup/status') return { needsSetup: true };
      if (path === '/auth/oauth/options') return { providers: [] };
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/dashboard?setupToken=from-link-token');

    expect(await screen.findByRole('heading', { name: 'Create your workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Setup token (optional)')).toHaveValue('from-link-token');
  });

  it('shows invite context and accepts the invite without manual token handling', async () => {
    tokenState.value = null;
    apiFetchMock.mockImplementation(async (path: string, options?: { body?: string }) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/invites/tok') {
        return {
          token: 'tok',
          inviteeEmail: 'guide@example.com',
          expiresAt: '2026-03-21T08:00:00.000Z',
          inviter: { id: 'u1', name: 'Alex', email: 'alex@example.com' },
          member: { id: 'u2', name: 'Jordan', email: 'jordan@example.com' },
          proposedRelationship: {
            templateId: 'active-guide',
            mode: 'active',
            canActOnItems: true,
            canManageRoutines: true,
            canManageFollowThrough: true,
            historyWindow: 'Last 30 days + next due',
          },
        };
      }
      if (path === '/auth/register') {
        expect(JSON.parse(options?.body ?? '{}')).toMatchObject({
          name: 'Guide User',
          email: 'guide@example.com',
          password: 'changeme123',
          token: 'tok',
        });
        return { accessToken: 'token', refreshToken: 'refresh' };
      }
      if (path === '/guides/accept') {
        expect(JSON.parse(options?.body ?? '{}')).toEqual({ token: 'tok' });
        return { accepted: true };
      }
      if (path === '/me') {
        return {
          ...meResponse,
          email: 'guide@example.com',
          name: 'Guide User',
          members: [
            {
              mode: 'active',
              canActOnItems: true,
              canManageRoutines: true,
              canManageFollowThrough: true,
              historyWindow: 'Last 30 days + next due',
              hiddenItemCount: 0,
              member: { id: 'u2', email: 'jordan@example.com', name: 'Jordan' },
            },
          ],
        };
      }
      if (path === '/items') return [];
      if (path === '/members') return [];
      if (path === '/history/audit') return [];
      if (path === '/retrospectives') return [];
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/join/tok');

    expect(await screen.findByText('Alex invited you into Leaf')).toBeInTheDocument();
    expect(screen.getByText('Alex is asking you to guide Jordan.')).toBeInTheDocument();
    expect(screen.getByText(/Last 30 days \+ next due/)).toBeInTheDocument();

    const user = userEvent.setup();
    const registerSection = screen.getByRole('heading', { name: 'Create your account and accept' }).closest('form')!;
    await user.type(within(registerSection).getByLabelText('Name'), 'Guide User');
    await user.type(within(registerSection).getByLabelText('Password'), 'changeme123');
    await user.click(within(registerSection).getByRole('button', { name: 'Create Account and Accept Invite' }));

    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Members' })).toBeInTheDocument();
  });

  it('renders the account menu in a high z-index overlay layer', async () => {
    renderApp('/dashboard');

    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: 'Open account menu' }))[0]!);

    const menu = await screen.findByTestId('account-menu');
    expect(menu).toHaveStyle({ zIndex: '2000' });
    expect(menu).toHaveStyle('--account-menu-hover-bg: rgba(122, 97, 77, 0.10)');
    expect(screen.getByTestId('account-menu-item-preferences')).toHaveStyle({
      background: 'var(--chakra-colors-transparent)',
    });
    expect(within(menu).getByText('Profile & Relationships')).toBeInTheDocument();
  });

  it('shows admin entry in the user menu only for admins', async () => {
    mockAuthedApi({ roles: [{ role: 'ADMIN' }, { role: 'USER' }] });
    renderApp('/dashboard');

    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: 'Open account menu' }))[0]!);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

});
