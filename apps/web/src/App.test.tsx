import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  timezone: 'UTC',
  weeklyDigestDay: 1,
  weeklyDigestHour: 8,
  roles: [{ role: 'USER' }],
  reviewTargets: [],
  reviewers: [],
};

function mockAuthedApi() {
  getTokenMock.mockReturnValue('token');
  apiFetchMock.mockImplementation(async (path: string) => {
    if (path === '/setup/status') return { needsSetup: false };
    if (path === '/auth/oauth/options') return { providers: [] };
    if (path === '/me') return meResponse;
    if (path === '/items') return [];
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
    mockAuthedApi();
  });

  it('renders tracked items page directly without crashing', async () => {
    renderApp('/items');

    expect(await screen.findByRole('heading', { name: 'Manage Tracked Items' })).toBeInTheDocument();
    expect(screen.getByText('You can combine multiple schedules on one item.')).toBeInTheDocument();
  });

  it('navigates from dashboard to tracked items', async () => {
    renderApp('/dashboard');
    await screen.findByRole('heading', { name: 'Upcoming Focus' });

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('link', { name: 'Tracked Items' })[0]!);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Manage Tracked Items' })).toBeInTheDocument();
    });
  });
});
