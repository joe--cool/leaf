import { ChakraProvider } from '@chakra-ui/react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const { apiFetchMock, getTokenMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  getTokenMock: vi.fn(),
}));

vi.mock('./api', () => ({
  apiFetch: apiFetchMock,
  clearToken: vi.fn(),
  getToken: getTokenMock,
  setRefreshToken: vi.fn(),
  setToken: vi.fn(),
}));

type MeResponse = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  weeklyDigestDay: number;
  weeklyDigestHour: number;
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
  roles: [{ role: 'USER' }],
  members: [],
  guides: [],
};

function mockAuthedApi(overrides: Partial<MeResponse> = {}) {
  const response = { ...meResponse, ...overrides };
  getTokenMock.mockReturnValue('token');
  apiFetchMock.mockImplementation(async (path: string) => {
    if (path === '/setup/status') return { needsSetup: false };
    if (path === '/auth/oauth/options') return { providers: [] };
    if (path === '/me') return response;
    if (path === '/items') return [];
    if (path === '/members') return [];
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
    expect(screen.getByText('2. Set the cadence')).toBeInTheDocument();
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
            member: { id: 'u2', email: 'member@example.com', name: 'Alex' },
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
            member: { id: 'u2', email: 'member@example.com', name: 'Alex' },
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
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/members');

    expect((await screen.findAllByRole('heading', { name: 'Members' })).length).toBeGreaterThan(0);
    expect(screen.getByText('Needs attention first')).toBeInTheDocument();
    expect(screen.getByText('Observation only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage routines' })).not.toBeInTheDocument();
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
            member: { id: 'u2', email: 'member@example.com', name: 'Alex' },
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
  });

  it('keeps preferences and admin out of the main app navigation', async () => {
    renderApp('/dashboard');

    await screen.findAllByRole('heading', { name: 'Overview' });
    expect(screen.queryByRole('link', { name: 'Profile & Relationships' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Notification Preferences' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Notification Preferences' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Active Guide/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your Guides' })).toBeInTheDocument();
    expect(screen.getByText('Jordan')).toBeInTheDocument();
    expect(screen.getByText("1 hidden item stays outside this guide's view.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your Members' })).toBeInTheDocument();
  });

  it('submits login when pressing Enter in the password field', async () => {
    getTokenMock.mockReturnValue(null);
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/setup/status') return { needsSetup: false };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/auth/login') return { accessToken: 'token', refreshToken: 'refresh' };
      if (path === '/me') return meResponse;
      if (path === '/items') return [];
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

  it('submits first-run setup with demo mode when the checkbox is enabled', async () => {
    getTokenMock.mockReturnValue(null);
    apiFetchMock.mockImplementation(async (path: string, options?: { body?: string }) => {
      if (path === '/setup/status') return { needsSetup: true };
      if (path === '/auth/oauth/options') return { providers: [] };
      if (path === '/setup/first-admin') {
        expect(JSON.parse(options?.body ?? '{}')).toMatchObject({
          email: 'admin@example.com',
          password: 'changeme123',
          demoMode: true,
        });
        return { accessToken: 'token', refreshToken: 'refresh' };
      }
      if (path === '/me') return { ...meResponse, roles: [{ role: 'ADMIN' }, { role: 'USER' }] };
      if (path === '/items') return [];
      if (path === '/members') return [];
      if (path === '/admin/users') return [];
      throw new Error(`Unexpected api path: ${path}`);
    });

    renderApp('/dashboard');

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Admin email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'changeme123');
    await user.click(screen.getByRole('checkbox', { name: 'Enable demo mode' }));
    await user.click(screen.getByRole('button', { name: 'Create First Admin' }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        '/setup/first-admin',
        expect.objectContaining({ method: 'POST' }),
      );
    });
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

  it('updates the default routine text when the category changes', async () => {
    renderApp('/routines');

    const user = userEvent.setup();
    const titleInput = (await screen.findByLabelText('Routine name')) as HTMLInputElement;
    expect(titleInput.value).toBe('Take evening supplement');

    await user.click(screen.getByRole('radio', { name: 'Exercise' }));
    expect(titleInput.value).toBe('Go for a walk');

    await user.clear(titleInput);
    await user.type(titleInput, 'Custom title');
    await user.click(screen.getByRole('radio', { name: 'Schoolwork' }));
    expect(titleInput.value).toBe('Custom title');
  });
});
