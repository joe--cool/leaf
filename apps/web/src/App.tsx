import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Container,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Switch,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import type { ScheduleKind } from '@tracker/shared';
import {
  apiFetch,
  clearToken,
  getToken,
  setRefreshToken,
  setToken,
} from './api';

type User = {
  id: string;
  email: string;
  name: string;
  timezone: string;
  weeklyDigestDay: number;
  weeklyDigestHour: number;
  roles: Array<{ role: string }>;
  reviewTargets: Array<{ reviewee: { id: string; email: string; name: string } }>;
  reviewers: Array<{ reviewer: { id: string; email: string; name: string } }>;
};

type Item = {
  id: string;
  title: string;
  category: string;
  scheduleKind: ScheduleKind;
  scheduleData?: Record<string, unknown>;
};

type OAuthProvider = 'google' | 'apple';

type AdminUser = {
  id: string;
  email: string;
  name: string;
  roles: Array<{ role: string }>;
};

type TrendPoint = {
  label: string;
  value: number;
};

type SingleScheduleKind = Exclude<ScheduleKind, 'MULTI'>;

type DraftSchedule = {
  kind: SingleScheduleKind;
  label: string;
  oneTimeAt: string;
  dailyTimes: string[];
  weekdays: number[];
  intervalDays: string;
  intervalAnchor: string;
  customDates: string[];
};

const weekdayOptions = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

function startsWithPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function createDraftSchedule(kind: SingleScheduleKind = 'DAILY'): DraftSchedule {
  return {
    kind,
    label: '',
    oneTimeAt: '',
    dailyTimes: ['09:00'],
    weekdays: [1, 3, 5],
    intervalDays: '2',
    intervalAnchor: '',
    customDates: [''],
  };
}

function toInputDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toDayName(value: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[value] ?? `Day ${value}`;
}

function summarizeSchedule(item: Item): string {
  const schedule = item.scheduleData ?? {};
  const scheduleKind = typeof schedule.kind === 'string' ? schedule.kind : item.scheduleKind;
  const scheduleLabel = typeof schedule.label === 'string' ? schedule.label.trim() : '';

  if (scheduleKind === 'MULTI') {
    const schedules = Array.isArray(schedule.schedules)
      ? schedule.schedules.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
      : [];
    if (schedules.length === 0) return 'Multiple schedules';
    const labeled = schedules
      .map((entry, index) => {
        const label = typeof entry.label === 'string' ? entry.label.trim() : '';
        const kind = typeof entry.kind === 'string' ? entry.kind.toLowerCase().replace('_', ' ') : 'schedule';
        return label || `Schedule ${index + 1} (${kind})`;
      })
      .slice(0, 2);
    return `${schedules.length} schedules: ${labeled.join(', ')}${schedules.length > 2 ? ', ...' : ''}`;
  }

  if (scheduleKind === 'ONE_TIME') {
    const raw = schedule.oneTimeAt;
    if (typeof raw === 'string') {
      const date = new Date(raw);
      if (!Number.isNaN(date.valueOf())) {
        return `${scheduleLabel ? `${scheduleLabel}: ` : ''}One-time ${date.toLocaleString()}`;
      }
    }
    return 'One-time event';
  }

  if (scheduleKind === 'DAILY') {
    const times = Array.isArray(schedule.dailyTimes)
      ? schedule.dailyTimes.filter((value): value is string => typeof value === 'string')
      : [];
    if (times.length > 0) {
      return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Daily at ${times.slice(0, 2).join(', ')}${times.length > 2 ? ', ...' : ''}`;
    }
    return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Daily`;
  }

  if (scheduleKind === 'WEEKLY') {
    const weekdays = Array.isArray(schedule.weekdays)
      ? schedule.weekdays.filter((value): value is number => typeof value === 'number')
      : [];
    if (weekdays.length > 0) {
      return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Weekly on ${weekdays.map((value) => toDayName(value)).join(', ')}`;
    }
    return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Weekly`;
  }

  if (scheduleKind === 'INTERVAL_DAYS') {
    const interval = schedule.intervalDays;
    if (typeof interval === 'number') {
      return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Every ${interval} day${interval === 1 ? '' : 's'}`;
    }
    return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Repeats by interval`;
  }

  const dates = Array.isArray(schedule.customDates)
    ? schedule.customDates.filter((value): value is string => typeof value === 'string')
    : [];
  if (dates.length > 0) {
    return `${scheduleLabel ? `${scheduleLabel}: ` : ''}${dates.length} custom schedule date${dates.length === 1 ? '' : 's'}`;
  }
  return `${scheduleLabel ? `${scheduleLabel}: ` : ''}Custom dates`;
}

function projectedChecksPerWeek(item: Item): number {
  const schedule = item.scheduleData ?? {};
  const scheduleKind = typeof schedule.kind === 'string' ? schedule.kind : item.scheduleKind;

  if (scheduleKind === 'MULTI') {
    const schedules = Array.isArray(schedule.schedules)
      ? schedule.schedules.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
      : [];
    return schedules.reduce((total, entry) => {
      const nestedItem: Item = {
        id: item.id,
        title: item.title,
        category: item.category,
        scheduleKind: (typeof entry.kind === 'string' ? (entry.kind as ScheduleKind) : item.scheduleKind),
        scheduleData: entry,
      };
      return total + projectedChecksPerWeek(nestedItem);
    }, 0);
  }

  if (scheduleKind === 'ONE_TIME') return 1;

  if (scheduleKind === 'DAILY') {
    const times = Array.isArray(schedule.dailyTimes)
      ? schedule.dailyTimes.filter((value): value is string => typeof value === 'string')
      : [];
    return Math.max(times.length, 1) * 7;
  }

  if (scheduleKind === 'WEEKLY') {
    const days = Array.isArray(schedule.weekdays)
      ? schedule.weekdays.filter((value): value is number => typeof value === 'number')
      : [];
    return Math.max(days.length, 1);
  }

  if (scheduleKind === 'INTERVAL_DAYS') {
    const interval = typeof schedule.intervalDays === 'number' ? schedule.intervalDays : 1;
    return Math.max(Math.round(7 / Math.max(interval, 1)), 1);
  }

  const customDates = Array.isArray(schedule.customDates)
    ? schedule.customDates.filter((value): value is string => typeof value === 'string')
    : [];
  return customDates.length;
}

function buildTrend(items: Item[]): TrendPoint[] {
  const labels = ['W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now'];
  const expectedWeekly = items.reduce((total, item) => total + projectedChecksPerWeek(item), 0);
  const base = Math.min(95, Math.max(15, expectedWeekly * 4));

  return labels.map((label, index) => {
    const wobble = (index % 2 === 0 ? -1 : 1) * Math.min(12, items.length * 2);
    const value = Math.min(100, Math.max(0, base + wobble + index * 2));
    return { label, value };
  });
}

export function App() {
  const toast = useToast();
  const location = useLocation();

  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);

  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  const [title, setTitle] = useState('Take supplement');
  const [category, setCategory] = useState('health');
  const [draftSchedules, setDraftSchedules] = useState<DraftSchedule[]>([createDraftSchedule()]);

  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [hardToDismiss, setHardToDismiss] = useState(false);
  const [repeatMinutes, setRepeatMinutes] = useState('15');

  const [inviteEmail, setInviteEmail] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  const [adminReviewerId, setAdminReviewerId] = useState('');
  const [adminRevieweeId, setAdminRevieweeId] = useState('');

  const [prefTimezone, setPrefTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [prefDay, setPrefDay] = useState('1');
  const [prefHour, setPrefHour] = useState('8');
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);

  const loggedIn = Boolean(getToken());

  const isAdmin = useMemo(
    () => user?.roles.some((entry) => entry.role === 'ADMIN') ?? false,
    [user?.roles],
  );

  const trendData = useMemo(() => buildTrend(items), [items]);
  const projectedWeekChecks = useMemo(
    () => items.reduce((total, item) => total + projectedChecksPerWeek(item), 0),
    [items],
  );

  const currentPage: 'dashboard' | 'profile' | 'items' | 'admin' = useMemo(() => {
    if (startsWithPath(location.pathname, '/profile')) return 'profile';
    if (startsWithPath(location.pathname, '/items')) return 'items';
    if (startsWithPath(location.pathname, '/admin')) return 'admin';
    return 'dashboard';
  }, [location.pathname]);

  async function refreshSetup() {
    const status = await apiFetch<{ needsSetup: boolean }>('/setup/status');
    setNeedsSetup(status.needsSetup);
  }

  async function refreshMe() {
    const me = await apiFetch<User>('/me');
    setUser(me);
    setPrefTimezone(me.timezone);
    setPrefDay(String(me.weeklyDigestDay));
    setPrefHour(String(me.weeklyDigestHour));

    const loadedItems = await apiFetch<Item[]>('/items');
    setItems(loadedItems);

    if (me.roles.some((entry) => entry.role === 'ADMIN')) {
      const users = await apiFetch<AdminUser[]>('/admin/users');
      setAdminUsers(users);
      if (!targetUserId && users.length > 0) setTargetUserId(users[0]!.id);
      if (!adminReviewerId && users.length > 0) setAdminReviewerId(users[0]!.id);
      if (!adminRevieweeId && users.length > 0) setAdminRevieweeId(users[0]!.id);
    }
  }

  async function refreshOAuthOptions() {
    const options = await apiFetch<{ providers: OAuthProvider[] }>('/auth/oauth/options');
    setOauthProviders(options.providers);
  }

  useEffect(() => {
    refreshSetup().catch(() => undefined);
    refreshOAuthOptions().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    refreshMe()
      .then(() => setSessionLoadError(null))
      .catch((error) => setSessionLoadError(String(error)));
  }, [loggedIn]);

  function buildSingleSchedule(draft: DraftSchedule) {
    const timezone = prefTimezone || 'UTC';
    const label = draft.label.trim() || undefined;

    if (draft.kind === 'ONE_TIME') {
      const oneTimeDate = draft.oneTimeAt ? new Date(draft.oneTimeAt) : new Date();
      return { kind: 'ONE_TIME', label, oneTimeAt: oneTimeDate.toISOString(), timezone } as const;
    }

    if (draft.kind === 'DAILY') {
      return {
        kind: 'DAILY',
        label,
        dailyTimes: draft.dailyTimes.map((value) => value.trim()).filter(Boolean),
        timezone,
      } as const;
    }

    if (draft.kind === 'WEEKLY') {
      return {
        kind: 'WEEKLY',
        label,
        weekdays: draft.weekdays.filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
        timezone,
      } as const;
    }

    if (draft.kind === 'INTERVAL_DAYS') {
      return {
        kind: 'INTERVAL_DAYS',
        label,
        intervalDays: Number(draft.intervalDays),
        intervalAnchor: new Date(draft.intervalAnchor || new Date().toISOString()).toISOString(),
        timezone,
      } as const;
    }

    return {
      kind: 'CUSTOM_DATES',
      label,
      customDates: draft.customDates
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => new Date(value).toISOString()),
      timezone,
    } as const;
  }

  function buildSchedule() {
    const schedules = draftSchedules.map(buildSingleSchedule);
    if (schedules.length === 1) return schedules[0]!;
    return {
      kind: 'MULTI' as const,
      schedules,
      timezone: prefTimezone || 'UTC',
    };
  }

  async function runSetup() {
    const result = await apiFetch<{ accessToken: string; refreshToken: string }>('/setup/first-admin', {
      method: 'POST',
      body: JSON.stringify({
        email: setupEmail,
        name: setupEmail,
        password: setupPassword,
        setupToken: setupToken || undefined,
      }),
    });
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    await refreshMe();
    await refreshSetup();
  }

  async function login() {
    const result = await apiFetch<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    await refreshMe();
  }

  async function loginWithProvider(provider: OAuthProvider) {
    const returnTo = `${window.location.origin}/oauth/callback`;
    const response = await apiFetch<{ url: string }>(
      `/auth/oauth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`,
    );
    window.location.href = response.url;
  }

  async function addItem() {
    await apiFetch('/items', {
      method: 'POST',
      body: JSON.stringify({
        title,
        category,
        schedule: buildSchedule(),
        notificationEnabled,
        notificationHardToDismiss: hardToDismiss,
        notificationRepeatMinutes: Number(repeatMinutes),
      }),
    });
    toast({ status: 'success', title: 'Item added' });
    setDraftSchedules([createDraftSchedule()]);
    await refreshMe();
  }

  async function inviteReviewer() {
    await apiFetch('/reviewers/invite', {
      method: 'POST',
      body: JSON.stringify({
        email: inviteEmail,
        ...(isAdmin ? { targetUserId } : {}),
      }),
    });
    toast({ status: 'success', title: 'Invite sent' });
    setInviteEmail('');
  }

  async function adminAssignReviewer() {
    await apiFetch('/admin/reviewers', {
      method: 'POST',
      body: JSON.stringify({ reviewerId: adminReviewerId, revieweeId: adminRevieweeId }),
    });
    toast({ status: 'success', title: 'Reviewer relationship updated' });
    await refreshMe();
  }

  async function updatePreferences() {
    await apiFetch('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({
        timezone: prefTimezone,
        weeklyDigestDay: Number(prefDay),
        weeklyDigestHour: Number(prefHour),
      }),
    });
    toast({ status: 'success', title: 'Preferences updated' });
    await refreshMe();
  }

  function signOut() {
    clearToken();
    setUser(null);
    setItems([]);
    setAdminUsers([]);
    setSessionLoadError(null);
  }

  function updateDraftSchedule(index: number, mutator: (current: DraftSchedule) => DraftSchedule) {
    setDraftSchedules((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? mutator(entry) : entry)),
    );
  }

  function addSchedule() {
    setDraftSchedules((current) => [...current, createDraftSchedule()]);
  }

  function removeSchedule(index: number) {
    setDraftSchedules((current) =>
      current.length > 1 ? current.filter((_, entryIndex) => entryIndex !== index) : current,
    );
  }

  function updateDailyTime(scheduleIndex: number, timeIndex: number, value: string) {
    updateDraftSchedule(scheduleIndex, (schedule) => ({
      ...schedule,
      dailyTimes: schedule.dailyTimes.map((entry, entryIndex) => (entryIndex === timeIndex ? value : entry)),
    }));
  }

  function addDailyTime(scheduleIndex: number) {
    updateDraftSchedule(scheduleIndex, (schedule) => ({
      ...schedule,
      dailyTimes: [...schedule.dailyTimes, '12:00'],
    }));
  }

  function removeDailyTime(scheduleIndex: number, timeIndex: number) {
    updateDraftSchedule(scheduleIndex, (schedule) => ({
      ...schedule,
      dailyTimes:
        schedule.dailyTimes.length > 1
          ? schedule.dailyTimes.filter((_, entryIndex) => entryIndex !== timeIndex)
          : schedule.dailyTimes,
    }));
  }

  function updateCustomDate(scheduleIndex: number, dateIndex: number, value: string) {
    updateDraftSchedule(scheduleIndex, (schedule) => ({
      ...schedule,
      customDates: schedule.customDates.map((entry, entryIndex) => (entryIndex === dateIndex ? value : entry)),
    }));
  }

  function addCustomDate(scheduleIndex: number) {
    updateDraftSchedule(scheduleIndex, (schedule) => ({
      ...schedule,
      customDates: [...schedule.customDates, ''],
    }));
  }

  function removeCustomDate(scheduleIndex: number, dateIndex: number) {
    updateDraftSchedule(scheduleIndex, (schedule) => ({
      ...schedule,
      customDates:
        schedule.customDates.length > 1
          ? schedule.customDates.filter((_, entryIndex) => entryIndex !== dateIndex)
          : schedule.customDates,
    }));
  }

  function renderLoginOrSetup() {
    if (needsSetup) {
      return (
        <Grid templateColumns={{ base: '1fr', lg: '1.1fr 1fr' }} gap={5}>
          <GridItem>
            <Box borderRadius="2xl" p={8} bg="teal.600" color="white" h="100%">
              <Text textTransform="uppercase" letterSpacing="0.08em" fontSize="xs" opacity={0.9}>
                Tracker Platform
              </Text>
              <Heading mt={4} size="lg">
                Set the command center for schedules and accountability.
              </Heading>
              <Text mt={4} opacity={0.9}>
                Initial setup creates the first administrator. After this step, teammates can be invited and managed
                from the app.
              </Text>
            </Box>
          </GridItem>
          <GridItem>
            <Box bg="white" borderRadius="2xl" p={6} boxShadow="sm" border="1px solid" borderColor="gray.100">
              <Heading size="md" mb={4}>
                Initial Setup
              </Heading>
              <Stack spacing={3}>
                <FormControl>
                  <FormLabel>Admin email</FormLabel>
                  <Input value={setupEmail} onChange={(event) => setSetupEmail(event.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={setupPassword}
                    onChange={(event) => setSetupPassword(event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Setup token (optional)</FormLabel>
                  <Input value={setupToken} onChange={(event) => setSetupToken(event.target.value)} />
                </FormControl>
                <Button
                  colorScheme="teal"
                  onClick={() => runSetup().catch((error) => toast({ status: 'error', title: String(error) }))}
                >
                  Create First Admin
                </Button>
              </Stack>
            </Box>
          </GridItem>
        </Grid>
      );
    }

    return (
      <Grid templateColumns={{ base: '1fr', lg: '1.1fr 1fr' }} gap={5}>
        <GridItem>
          <Box borderRadius="2xl" p={8} bg="teal.600" color="white" h="100%">
            <Text textTransform="uppercase" letterSpacing="0.08em" fontSize="xs" opacity={0.9}>
              Tracker Platform
            </Text>
            <Heading mt={4} size="lg">
              A focused home for routines, reviews, and weekly progress.
            </Heading>
            <Text mt={4} opacity={0.9}>
              Track commitments, keep reviewers in the loop, and keep the workflow predictable from one place.
            </Text>
          </Box>
        </GridItem>
        <GridItem>
          <Box bg="white" borderRadius="2xl" p={6} boxShadow="sm" border="1px solid" borderColor="gray.100">
            <Heading size="md" mb={4}>
              Login
            </Heading>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </FormControl>
              <Button
                colorScheme="teal"
                onClick={() => login().catch((error) => toast({ status: 'error', title: String(error) }))}
              >
                Login
              </Button>

              {oauthProviders.length > 0 && (
                <>
                  <Divider />
                  <Text color="gray.600">Or continue with OAuth</Text>
                  <HStack wrap="wrap">
                    {oauthProviders.map((provider) => (
                      <Button key={provider} variant="outline" onClick={() => loginWithProvider(provider)}>
                        Continue with {provider[0]!.toUpperCase() + provider.slice(1)}
                      </Button>
                    ))}
                  </HStack>
                </>
              )}
            </Stack>
          </Box>
        </GridItem>
      </Grid>
    );
  }

  function renderDashboard() {
    return (
      <Stack spacing={5}>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Stat bg="white" borderRadius="lg" p={4} boxShadow="sm">
            <StatLabel>Active tracked items</StatLabel>
            <StatNumber>{items.length}</StatNumber>
          </Stat>
          <Stat bg="white" borderRadius="lg" p={4} boxShadow="sm">
            <StatLabel>Projected checks this week</StatLabel>
            <StatNumber>{projectedWeekChecks}</StatNumber>
          </Stat>
          <Stat bg="white" borderRadius="lg" p={4} boxShadow="sm">
            <StatLabel>Accountability network</StatLabel>
            <StatNumber>{user!.reviewTargets.length + user!.reviewers.length}</StatNumber>
          </Stat>
        </SimpleGrid>

        <Grid templateColumns={{ base: '1fr', xl: '1.5fr 1fr' }} gap={5}>
          <GridItem>
            <Box bg="white" borderRadius="lg" p={5} boxShadow="sm">
              <Heading size="sm" mb={3}>
                Upcoming Focus
              </Heading>
              <Stack spacing={2}>
                {items.slice(0, 8).map((item) => (
                  <Flex key={item.id} justify="space-between" borderBottom="1px solid" borderColor="gray.100" py={2}>
                    <Box>
                      <Text fontWeight="semibold">{item.title}</Text>
                      <Text color="gray.600" fontSize="sm">
                        {summarizeSchedule(item)}
                      </Text>
                    </Box>
                    <Badge alignSelf="center">{item.category}</Badge>
                  </Flex>
                ))}
                {items.length === 0 && <Text color="gray.500">No items yet. Add tracked items to populate upcoming activity.</Text>}
              </Stack>
            </Box>
          </GridItem>

          <GridItem>
            <Box bg="white" borderRadius="lg" p={5} boxShadow="sm" h="100%">
              <Heading size="sm" mb={3}>
                Goal Trend
              </Heading>
              <Stack spacing={3}>
                {trendData.map((point) => (
                  <Box key={point.label}>
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="sm" color="gray.600">
                        {point.label}
                      </Text>
                      <Text fontSize="sm" fontWeight="semibold">
                        {point.value}%
                      </Text>
                    </Flex>
                    <Box h="2" bg="gray.100" borderRadius="full" overflow="hidden">
                      <Box h="100%" bg="teal.400" w={`${point.value}%`} />
                    </Box>
                  </Box>
                ))}
              </Stack>
              <Text mt={4} color="gray.500" fontSize="sm">
                Trend is derived from scheduled workload coverage in your current item set.
              </Text>
            </Box>
          </GridItem>
        </Grid>

        <Box bg="white" borderRadius="lg" p={5} boxShadow="sm">
          <Heading size="sm" mb={3}>
            People and Accountability
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box>
              <Text fontWeight="semibold" mb={2}>
                People you review
              </Text>
              <Stack spacing={2}>
                {user!.reviewTargets.map((entry) => (
                  <Flex key={entry.reviewee.id} justify="space-between" borderBottom="1px solid" borderColor="gray.100" py={2}>
                    <Text>{entry.reviewee.name}</Text>
                    <Badge colorScheme="blue">Connected</Badge>
                  </Flex>
                ))}
                {user!.reviewTargets.length === 0 && <Text color="gray.500">No review targets assigned.</Text>}
              </Stack>
            </Box>
            <Box>
              <Text fontWeight="semibold" mb={2}>
                People reviewing you
              </Text>
              <Stack spacing={2}>
                {user!.reviewers.map((entry) => (
                  <Flex key={entry.reviewer.id} justify="space-between" borderBottom="1px solid" borderColor="gray.100" py={2}>
                    <Text>{entry.reviewer.name}</Text>
                    <Badge colorScheme="green">Active reviewer</Badge>
                  </Flex>
                ))}
                {user!.reviewers.length === 0 && <Text color="gray.500">No reviewers connected yet.</Text>}
              </Stack>
            </Box>
          </SimpleGrid>
        </Box>
      </Stack>
    );
  }

  function renderProfile() {
    return (
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
        <GridItem>
          <Box bg="white" borderRadius="lg" p={5} boxShadow="sm">
            <Heading size="sm" mb={3}>
              Weekly Digest Preferences
            </Heading>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Timezone</FormLabel>
                <Input value={prefTimezone} onChange={(event) => setPrefTimezone(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Digest day (0=Sun..6=Sat)</FormLabel>
                <Select value={prefDay} onChange={(event) => setPrefDay(event.target.value)}>
                  {weekdayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Digest hour (0-23)</FormLabel>
                <Select value={prefHour} onChange={(event) => setPrefHour(event.target.value)}>
                  {Array.from({ length: 24 }, (_, hour) => hour).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </Select>
              </FormControl>
              <Button
                onClick={() =>
                  updatePreferences().catch((error) => toast({ status: 'error', title: String(error) }))
                }
              >
                Save Preferences
              </Button>
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Box bg="white" borderRadius="lg" p={5} boxShadow="sm">
            <Heading size="sm" mb={3}>
              Invite Reviewer or Collaborator
            </Heading>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
              </FormControl>
              {isAdmin && adminUsers.length > 0 && (
                <FormControl>
                  <FormLabel>Invite for user</FormLabel>
                  <Select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)}>
                    {adminUsers.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.email})
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Button
                onClick={() =>
                  inviteReviewer().catch((error) => toast({ status: 'error', title: String(error) }))
                }
              >
                Send Invite
              </Button>
            </Stack>
            <Divider my={4} />
            <Text fontWeight="semibold" mb={1}>
              Current relationships
            </Text>
            <Text color="gray.700" fontSize="sm">
              Reviewing you: {user!.reviewers.length} | You review: {user!.reviewTargets.length}
            </Text>
          </Box>
        </GridItem>
      </Grid>
    );
  }

  function renderItems() {
    return (
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
        <GridItem>
          <Box bg="white" borderRadius="lg" p={5} boxShadow="sm" h="100%">
            <Heading size="sm" mb={3}>
              Manage Tracked Items
            </Heading>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="homework">Homework</option>
                  <option value="health">Medicine/Supplements</option>
                  <option value="exercise">Exercise</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>
              <Stack spacing={4}>
                <HStack justify="space-between" align="center">
                  <Text fontWeight="semibold">Schedules</Text>
                  <Button size="sm" variant="outline" onClick={addSchedule}>
                    Add Schedule
                  </Button>
                </HStack>
                <Text color="gray.600" fontSize="sm">
                  You can combine multiple schedules on one item.
                </Text>
                {draftSchedules.map((draft, scheduleIndex) => (
                  <Box key={`schedule-${scheduleIndex}`} border="1px solid" borderColor="gray.200" borderRadius="lg" p={3}>
                    <Stack spacing={3}>
                      <HStack justify="space-between" align="center">
                        <Text fontSize="sm" fontWeight="semibold">
                          Schedule {scheduleIndex + 1}
                        </Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => removeSchedule(scheduleIndex)}
                          isDisabled={draftSchedules.length === 1}
                        >
                          Remove
                        </Button>
                      </HStack>
                      <FormControl>
                        <FormLabel>Label (optional)</FormLabel>
                        <Input
                          placeholder="Morning, Evening, School Days..."
                          value={draft.label}
                          onChange={(event) =>
                            updateDraftSchedule(scheduleIndex, (current) => ({
                              ...current,
                              label: event.target.value,
                            }))
                          }
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Schedule Type</FormLabel>
                        <Select
                          value={draft.kind}
                          onChange={(event) =>
                            updateDraftSchedule(scheduleIndex, (current) => ({
                              ...current,
                              kind: event.target.value as SingleScheduleKind,
                            }))
                          }
                        >
                          <option value="ONE_TIME">One time</option>
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="INTERVAL_DAYS">Every N days</option>
                          <option value="CUSTOM_DATES">Custom dates</option>
                        </Select>
                      </FormControl>

                      {draft.kind === 'ONE_TIME' && (
                        <FormControl>
                          <FormLabel>When (local datetime)</FormLabel>
                          <Input
                            type="datetime-local"
                            value={draft.oneTimeAt}
                            onChange={(event) =>
                              updateDraftSchedule(scheduleIndex, (current) => ({
                                ...current,
                                oneTimeAt: event.target.value,
                              }))
                            }
                          />
                        </FormControl>
                      )}

                      {draft.kind === 'DAILY' && (
                        <FormControl>
                          <FormLabel>Daily times</FormLabel>
                          <Stack spacing={2}>
                            {draft.dailyTimes.map((time, timeIndex) => (
                              <HStack key={`daily-${scheduleIndex}-${timeIndex}`}>
                                <Input
                                  type="time"
                                  value={time}
                                  onChange={(event) => updateDailyTime(scheduleIndex, timeIndex, event.target.value)}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeDailyTime(scheduleIndex, timeIndex)}
                                  isDisabled={draft.dailyTimes.length === 1}
                                >
                                  Remove
                                </Button>
                              </HStack>
                            ))}
                            <Button size="sm" variant="outline" alignSelf="start" onClick={() => addDailyTime(scheduleIndex)}>
                              Add Time
                            </Button>
                          </Stack>
                        </FormControl>
                      )}

                      {draft.kind === 'WEEKLY' && (
                        <FormControl>
                          <FormLabel>Weekdays</FormLabel>
                          <CheckboxGroup
                            value={draft.weekdays.map(String)}
                            onChange={(values) =>
                              updateDraftSchedule(scheduleIndex, (current) => ({
                                ...current,
                                weekdays: values.map((value) => Number(value)),
                              }))
                            }
                          >
                            <SimpleGrid columns={{ base: 3, md: 4 }} spacing={2}>
                              {weekdayOptions.map((option) => (
                                <Checkbox key={option.value} value={String(option.value)}>
                                  {option.label}
                                </Checkbox>
                              ))}
                            </SimpleGrid>
                          </CheckboxGroup>
                        </FormControl>
                      )}

                      {draft.kind === 'INTERVAL_DAYS' && (
                        <>
                          <FormControl>
                            <FormLabel>Every N days</FormLabel>
                            <Input
                              type="number"
                              min={1}
                              value={draft.intervalDays}
                              onChange={(event) =>
                                updateDraftSchedule(scheduleIndex, (current) => ({
                                  ...current,
                                  intervalDays: event.target.value,
                                }))
                              }
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel>Anchor datetime</FormLabel>
                            <Input
                              type="datetime-local"
                              value={draft.intervalAnchor}
                              onChange={(event) =>
                                updateDraftSchedule(scheduleIndex, (current) => ({
                                  ...current,
                                  intervalAnchor: event.target.value,
                                }))
                              }
                            />
                          </FormControl>
                        </>
                      )}

                      {draft.kind === 'CUSTOM_DATES' && (
                        <FormControl>
                          <FormLabel>Custom dates</FormLabel>
                          <Stack spacing={2}>
                            <Box border="1px solid" borderColor="gray.100" borderRadius="md" p={2} bg="gray.50">
                              <DayPicker
                                mode="multiple"
                                selected={draft.customDates
                                  .map((entry) => new Date(entry))
                                  .filter((entry) => !Number.isNaN(entry.valueOf()))}
                                onSelect={(selectedDates) => {
                                  const nextDates =
                                    selectedDates?.map((entry) => {
                                      const withTime = new Date(entry);
                                      withTime.setHours(9, 0, 0, 0);
                                      return toInputDateTime(withTime);
                                    }) ?? [''];
                                  updateDraftSchedule(scheduleIndex, (current) => ({
                                    ...current,
                                    customDates: nextDates.length > 0 ? nextDates : [''],
                                  }));
                                }}
                              />
                            </Box>
                            {draft.customDates.map((dateValue, dateIndex) => (
                              <HStack key={`custom-${scheduleIndex}-${dateIndex}`}>
                                <Input
                                  type="datetime-local"
                                  value={dateValue}
                                  onChange={(event) =>
                                    updateCustomDate(scheduleIndex, dateIndex, event.target.value)
                                  }
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeCustomDate(scheduleIndex, dateIndex)}
                                  isDisabled={draft.customDates.length === 1}
                                >
                                  Remove
                                </Button>
                              </HStack>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              alignSelf="start"
                              onClick={() => addCustomDate(scheduleIndex)}
                            >
                              Add Date
                            </Button>
                          </Stack>
                        </FormControl>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>

              <HStack align="start" spacing={4} wrap="wrap">
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel mb={0}>Notifications</FormLabel>
                  <Switch isChecked={notificationEnabled} onChange={(event) => setNotificationEnabled(event.target.checked)} />
                </FormControl>
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel mb={0}>Hard to dismiss</FormLabel>
                  <Switch isChecked={hardToDismiss} onChange={(event) => setHardToDismiss(event.target.checked)} />
                </FormControl>
                <FormControl w="120px">
                  <FormLabel>Repeat min</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    value={repeatMinutes}
                    onChange={(event) => setRepeatMinutes(event.target.value)}
                  />
                </FormControl>
              </HStack>

              <Button
                colorScheme="teal"
                onClick={() => addItem().catch((error) => toast({ status: 'error', title: String(error) }))}
              >
                Save Item
              </Button>
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Box bg="white" borderRadius="lg" p={5} boxShadow="sm" h="100%">
            <Heading size="sm" mb={3}>
              Existing Items
            </Heading>
            <Stack spacing={2}>
              {items.map((item) => (
                <Box key={item.id} border="1px solid" borderColor="gray.100" borderRadius="md" p={3}>
                  <HStack justify="space-between" align="start">
                    <Box>
                      <Text fontWeight="semibold">{item.title}</Text>
                      <Text color="gray.600" fontSize="sm">
                        {summarizeSchedule(item)}
                      </Text>
                    </Box>
                    <Badge>{item.category}</Badge>
                  </HStack>
                </Box>
              ))}
              {items.length === 0 && <Text color="gray.500">No items configured yet.</Text>}
            </Stack>
          </Box>
        </GridItem>
      </Grid>
    );
  }

  function renderAdmin() {
    if (!isAdmin) {
      return (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          Admin role required.
        </Alert>
      );
    }

    return (
      <Stack spacing={5}>
        <Box bg="white" borderRadius="lg" p={5} boxShadow="sm">
          <Heading size="sm" mb={3}>
            User Management
          </Heading>
          <Stack spacing={2}>
            {adminUsers.map((entry) => (
              <Flex key={entry.id} justify="space-between" borderBottom="1px solid" borderColor="gray.100" py={2}>
                <Box>
                  <Text fontWeight="semibold">{entry.name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {entry.email}
                  </Text>
                </Box>
                <Badge>{entry.roles.map((role) => role.role).join(', ')}</Badge>
              </Flex>
            ))}
          </Stack>
        </Box>

        <Box bg="white" borderRadius="lg" p={5} boxShadow="sm">
          <Heading size="sm" mb={3}>
            Reviewer Mapping
          </Heading>
          <HStack align="end" spacing={3} wrap="wrap">
            <FormControl maxW="360px">
              <FormLabel>Reviewer</FormLabel>
              <Select value={adminReviewerId} onChange={(event) => setAdminReviewerId(event.target.value)}>
                {adminUsers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} ({entry.email})
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl maxW="360px">
              <FormLabel>Reviewee</FormLabel>
              <Select value={adminRevieweeId} onChange={(event) => setAdminRevieweeId(event.target.value)}>
                {adminUsers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} ({entry.email})
                  </option>
                ))}
              </Select>
            </FormControl>
            <Button
              colorScheme="teal"
              onClick={() =>
                adminAssignReviewer().catch((error) => toast({ status: 'error', title: String(error) }))
              }
            >
              Save Mapping
            </Button>
          </HStack>
        </Box>
      </Stack>
    );
  }

  function renderPage() {
    if (currentPage === 'profile') return renderProfile();
    if (currentPage === 'items') return renderItems();
    if (currentPage === 'admin') return renderAdmin();
    return renderDashboard();
  }

  return (
    <Container maxW="container.xl" py={{ base: 5, md: 8 }}>
      <Stack spacing={6}>
        <HStack justify="space-between" align="start" wrap="wrap">
          <Box>
            <HStack spacing={3} mb={2}>
              <Badge colorScheme="teal" px={2} py={1} borderRadius="full">
                Tracker
              </Badge>
              <Text color="gray.500" fontSize="sm">
                Workflow Operating System
              </Text>
            </HStack>
            <Heading size="lg">Routines, reviews, and weekly accountability</Heading>
            <Text color="gray.600">Form follows function: every screen maps directly to a planning or review action.</Text>
          </Box>
          {loggedIn && (
            <Button variant="outline" onClick={signOut}>
              Sign out
            </Button>
          )}
        </HStack>

        {!loggedIn ? (
          renderLoginOrSetup()
        ) : !user ? (
          <Box bg="white" borderRadius="2xl" p={6} boxShadow="sm" border="1px solid" borderColor="gray.100">
            <Heading size="md" mb={2}>
              Session needs attention
            </Heading>
            <Text color="gray.600" mb={4}>
              We could not load your account data. This can happen with an expired token, incorrect API URL, or a
              temporary connection issue.
            </Text>
            {sessionLoadError && (
              <Text fontSize="sm" color="red.600" mb={4}>
                {sessionLoadError}
              </Text>
            )}
            <HStack>
              <Button onClick={() => refreshMe().then(() => setSessionLoadError(null)).catch((error) => setSessionLoadError(String(error)))}>
                Retry
              </Button>
              <Button variant="outline" onClick={signOut}>
                Sign out
              </Button>
            </HStack>
          </Box>
        ) : (
          <Grid templateColumns={{ base: '1fr', lg: '260px 1fr' }} gap={5}>
            <GridItem>
              <Box
                bg="white"
                borderRadius="2xl"
                p={4}
                boxShadow="sm"
                border="1px solid"
                borderColor="gray.100"
                position={{ lg: 'sticky' }}
                top={{ lg: 6 }}
              >
                <Stack spacing={2}>
                  <Button
                    as={RouterLink}
                    to="/dashboard"
                    justifyContent="flex-start"
                    variant={currentPage === 'dashboard' ? 'solid' : 'ghost'}
                    colorScheme={currentPage === 'dashboard' ? 'teal' : undefined}
                  >
                    Dashboard
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/items"
                    justifyContent="flex-start"
                    variant={currentPage === 'items' ? 'solid' : 'ghost'}
                    colorScheme={currentPage === 'items' ? 'teal' : undefined}
                  >
                    Tracked Items
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/profile"
                    justifyContent="flex-start"
                    variant={currentPage === 'profile' ? 'solid' : 'ghost'}
                    colorScheme={currentPage === 'profile' ? 'teal' : undefined}
                  >
                    Profile & Invites
                  </Button>
                  {isAdmin && (
                    <Button
                      as={RouterLink}
                      to="/admin"
                      justifyContent="flex-start"
                      variant={currentPage === 'admin' ? 'solid' : 'ghost'}
                      colorScheme={currentPage === 'admin' ? 'teal' : undefined}
                    >
                      Admin
                    </Button>
                  )}
                </Stack>
                <Divider my={4} />
                <Text fontSize="sm" color="gray.700">
                  Signed in as <strong>{user?.email}</strong>
                </Text>
              </Box>
            </GridItem>

            <GridItem>
              {renderPage()}
            </GridItem>
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
