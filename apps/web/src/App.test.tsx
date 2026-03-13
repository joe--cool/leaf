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

const meResponse = {
  id: 'u1',
  email: 'user@example.com',
  name: 'User',
  avatarUrl: null,
  timezone: 'UTC',
  weeklyDigestDay: 1,
  weeklyDigestHour: 8,
  roles: [{ role: 'USER' }],
  reviewTargets: [],
  reviewers: [],
};

function mockAuthedApi(overrides: Partial<typeof meResponse> = {}) {
  const response = { ...meResponse, ...overrides };
  getTokenMock.mockReturnValue('token');
  apiFetchMock.mockImplementation(async (path: string) => {
    if (path === '/setup/status') return { needsSetup: false };
    if (path === '/auth/oauth/options') return { providers: [] };
    if (path === '/me') return response;
    if (path === '/items') return [];
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

  it('renders tracked items page directly without crashing', async () => {
    renderApp('/items');

    expect((await screen.findAllByRole('heading', { name: 'Tracked Items' })).length).toBeGreaterThan(0);
    expect(screen.getByText('2. Set the cadence')).toBeInTheDocument();
  });

  it('navigates from dashboard to tracked items', async () => {
    renderApp('/dashboard');
    expect((await screen.findAllByRole('heading', { name: 'Overview' })).length).toBeGreaterThan(0);

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('link', { name: /Tracked Items/i })[0]!);

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Tracked Items' }).length).toBeGreaterThan(0);
    });
  });

  it('keeps preferences and admin out of the main app navigation', async () => {
    renderApp('/dashboard');

    await screen.findAllByRole('heading', { name: 'Overview' });
    expect(screen.queryByRole('link', { name: 'Preferences' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('enters account mode from the user menu and offers a return path', async () => {
    renderApp('/dashboard');

    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: 'Open account menu' }))[0]!);
    const openedMenu = (await screen.findAllByTestId('account-menu'))[0]!;
    await user.click(within(openedMenu).getByText('Manage Preferences'));

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Preferences' }).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('link', { name: 'Back to app' })).toBeInTheDocument();
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
    expect(screen.getByText('Manage Preferences')).toBeInTheDocument();
  });

  it('shows admin entry in the user menu only for admins', async () => {
    mockAuthedApi({ roles: [{ role: 'ADMIN' }, { role: 'USER' }] });
    renderApp('/dashboard');

    const user = userEvent.setup();
    await user.click((await screen.findAllByRole('button', { name: 'Open account menu' }))[0]!);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('updates the default tracked-item text when the category changes', async () => {
    renderApp('/items');

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
