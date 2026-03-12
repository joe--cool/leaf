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
  IconButton,
  Image,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Switch,
  Text,
  useColorMode,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import type { ScheduleKind } from '@tracker/shared';
import { apiFetch, clearToken, getToken, setRefreshToken, setToken } from './api';

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

type PageKey = 'dashboard' | 'profile' | 'items' | 'admin';
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

const navItems: Array<{ key: PageKey; path: string; label: string; summary: string }> = [
  {
    key: 'dashboard',
    path: '/dashboard',
    label: 'Overview',
    summary: 'Plan the week and spot focus areas.',
  },
  {
    key: 'items',
    path: '/items',
    label: 'Tracked Items',
    summary: 'Create schedules and notification rules.',
  },
  {
    key: 'profile',
    path: '/profile',
    label: 'Preferences',
    summary: 'Digest settings, invites, and relationships.',
  },
  { key: 'admin', path: '/admin', label: 'Admin', summary: 'Govern users and reviewer mappings.' },
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
      ? schedule.schedules.filter(
          (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
        )
      : [];
    if (schedules.length === 0) return 'Multiple schedules';
    const labeled = schedules
      .map((entry, index) => {
        const label = typeof entry.label === 'string' ? entry.label.trim() : '';
        const kind =
          typeof entry.kind === 'string' ? entry.kind.toLowerCase().replace('_', ' ') : 'schedule';
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
      ? schedule.schedules.filter(
          (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
        )
      : [];
    return schedules.reduce((total, entry) => {
      const nestedItem: Item = {
        id: item.id,
        title: item.title,
        category: item.category,
        scheduleKind:
          typeof entry.kind === 'string' ? (entry.kind as ScheduleKind) : item.scheduleKind,
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

function NavButton({
  label,
  summary,
  to,
  active,
  accent,
}: {
  label: string;
  summary: string;
  to: string;
  active: boolean;
  accent: string;
}) {
  const activeBg = accent === 'clay' ? 'clay.500' : 'leaf.500';
  const activeShadow =
    accent === 'clay'
      ? '0 18px 36px rgba(163, 88, 54, 0.24)'
      : '0 18px 36px rgba(79, 118, 88, 0.22)';

  return (
    <Button
      as={RouterLink}
      to={to}
      justifyContent="flex-start"
      h="auto"
      py={4}
      px={4}
      variant="ghost"
      borderRadius="2xl"
      bg={active ? activeBg : 'transparent'}
      color={active ? 'white' : 'inherit'}
      boxShadow={active ? activeShadow : 'none'}
      _hover={{ bg: active ? activeBg : 'blackAlpha.100' }}
      _dark={{ _hover: { bg: active ? activeBg : 'whiteAlpha.140' } }}
    >
      <Stack spacing={0.5} align="start">
        <Text fontWeight="semibold">{label}</Text>
        <Text fontSize="xs" opacity={active ? 0.84 : 0.72} whiteSpace="normal" textAlign="left">
          {summary}
        </Text>
      </Stack>
    </Button>
  );
}

export function App() {
  const toast = useToast();
  const location = useLocation();
  const { colorMode, toggleColorMode } = useColorMode();

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

  const [prefTimezone, setPrefTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
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

  const currentPage: PageKey = useMemo(() => {
    if (startsWithPath(location.pathname, '/profile')) return 'profile';
    if (startsWithPath(location.pathname, '/items')) return 'items';
    if (startsWithPath(location.pathname, '/admin')) return 'admin';
    return 'dashboard';
  }, [location.pathname]);

  const adminMode = currentPage === 'admin' && isAdmin;
  const shellBg = useColorModeValue('rgba(252, 249, 243, 0.9)', 'rgba(14, 19, 19, 0.92)');
  const shellBorder = useColorModeValue('rgba(161, 129, 107, 0.18)', 'rgba(219, 208, 189, 0.12)');
  const panelBg = useColorModeValue('rgba(255, 253, 249, 0.88)', 'rgba(23, 29, 29, 0.88)');
  const panelBgStrong = useColorModeValue('rgba(255, 252, 246, 0.96)', 'rgba(28, 34, 34, 0.94)');
  const panelBorder = useColorModeValue('rgba(161, 129, 107, 0.16)', 'rgba(222, 212, 194, 0.11)');
  const mutedText = useColorModeValue('blackAlpha.700', 'whiteAlpha.700');
  const subtleText = useColorModeValue('blackAlpha.600', 'whiteAlpha.600');
  const statGlow = useColorModeValue(
    '0 24px 80px rgba(107, 85, 69, 0.12)',
    '0 24px 80px rgba(0, 0, 0, 0.34)',
  );
  const appBg = useColorModeValue('#f5efe6', '#0e1313');
  const overlayGradient = useColorModeValue(
    'radial(circle at top left, rgba(192, 88, 40, 0.15), transparent 32%), radial(circle at bottom right, rgba(74, 109, 83, 0.16), transparent 28%)',
    'radial(circle at top left, rgba(192, 88, 40, 0.20), transparent 30%), radial(circle at bottom right, rgba(86, 126, 96, 0.22), transparent 28%)',
  );
  const heroGradient = useColorModeValue(
    'linear(135deg, rgba(247, 239, 227, 0.96), rgba(244, 249, 242, 0.96) 55%, rgba(255, 248, 243, 0.92))',
    'linear(135deg, rgba(34, 25, 22, 0.96), rgba(18, 28, 24, 0.96) 55%, rgba(31, 23, 21, 0.96))',
  );
  const adminModeGradient = useColorModeValue(
    'linear(135deg, rgba(243, 224, 214, 0.98), rgba(251, 242, 236, 0.94))',
    'linear(135deg, rgba(70, 40, 31, 0.94), rgba(31, 21, 18, 0.96))',
  );
  const modeGradient = adminMode ? adminModeGradient : heroGradient;
  const progressTrackBg = useColorModeValue('rgba(108, 92, 80, 0.10)', 'rgba(255, 255, 255, 0.08)');
  const accent = adminMode ? 'clay' : 'leaf';
  const pageEyebrow =
    currentPage === 'dashboard'
      ? 'Calm operations'
      : currentPage === 'items'
        ? 'Schedule studio'
        : currentPage === 'profile'
          ? 'Personal settings'
          : 'Administrative mode';
  const pageTitle =
    currentPage === 'dashboard'
      ? 'Upcoming Focus'
      : currentPage === 'items'
        ? 'Manage Tracked Items'
        : currentPage === 'profile'
          ? 'Preferences and relationships'
          : 'Admin control room';
  const pageSummary =
    currentPage === 'dashboard'
      ? 'See workload, connected people, and the routines that need attention next.'
      : currentPage === 'items'
        ? 'Shape schedules, notification cadence, and item categories from one composition surface.'
        : currentPage === 'profile'
          ? 'Control digest delivery, invite reviewers, and keep accountability relationships current.'
          : 'You are operating on behalf of the whole workspace. User governance and reviewer assignment live here.';

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
        weekdays: draft.weekdays.filter(
          (value) => Number.isInteger(value) && value >= 0 && value <= 6,
        ),
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
    const result = await apiFetch<{ accessToken: string; refreshToken: string }>(
      '/setup/first-admin',
      {
        method: 'POST',
        body: JSON.stringify({
          email: setupEmail,
          name: setupEmail,
          password: setupPassword,
          setupToken: setupToken || undefined,
        }),
      },
    );
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
      dailyTimes: schedule.dailyTimes.map((entry, entryIndex) =>
        entryIndex === timeIndex ? value : entry,
      ),
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
      customDates: schedule.customDates.map((entry, entryIndex) =>
        entryIndex === dateIndex ? value : entry,
      ),
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

  function renderAuthShell() {
    return (
      <Grid templateColumns={{ base: '1fr', xl: '1.1fr 0.9fr' }} gap={6}>
        <GridItem>
          <Box
            bgGradient={heroGradient}
            borderRadius="3xl"
            p={{ base: 6, md: 8 }}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
            overflow="hidden"
            position="relative"
          >
            <Box
              position="absolute"
              top="-10"
              right="-10"
              w="180px"
              h="180px"
              borderRadius="full"
              bg="whiteAlpha.200"
            />
            <Stack spacing={6} position="relative">
              <HStack spacing={4}>
                <Box
                  bg="rgba(255,255,255,0.54)"
                  _dark={{ bg: 'whiteAlpha.120' }}
                  p={3}
                  borderRadius="2xl"
                >
                  <Image src="/leaf.svg" alt="leaf logo" boxSize="44px" />
                </Box>
                <Box>
                  <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                    leaf
                  </Badge>
                  <Text mt={2} fontSize="sm" color={mutedText}>
                    Designed for calm routine management and accountable follow-through.
                  </Text>
                </Box>
              </HStack>

              <Box>
                <Heading size="2xl" lineHeight="1.05" maxW="16ch">
                  Build steady routines with a quieter, clearer operating surface.
                </Heading>
                <Text mt={4} maxW="34rem" color={mutedText}>
                  leaf turns schedules, reminders, and reviewer relationships into one coordinated
                  workspace. The interface stays restrained so the planning work remains legible.
                </Text>
              </Box>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                <Box bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.90' }} borderRadius="2xl" p={4}>
                  <Text
                    fontSize="xs"
                    textTransform="uppercase"
                    letterSpacing="0.12em"
                    color={subtleText}
                  >
                    Orchestration
                  </Text>
                  <Text mt={2} fontWeight="semibold">
                    Flexible schedules from one-time through layered recurring patterns.
                  </Text>
                </Box>
                <Box bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.90' }} borderRadius="2xl" p={4}>
                  <Text
                    fontSize="xs"
                    textTransform="uppercase"
                    letterSpacing="0.12em"
                    color={subtleText}
                  >
                    Accountability
                  </Text>
                  <Text mt={2} fontWeight="semibold">
                    Reviewers, invites, and weekly digest preferences stay connected to the work.
                  </Text>
                </Box>
                <Box bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.90' }} borderRadius="2xl" p={4}>
                  <Text
                    fontSize="xs"
                    textTransform="uppercase"
                    letterSpacing="0.12em"
                    color={subtleText}
                  >
                    Operational clarity
                  </Text>
                  <Text mt={2} fontWeight="semibold">
                    Admin actions live in a clearly distinct mode instead of blending into daily
                    use.
                  </Text>
                </Box>
              </SimpleGrid>
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Box
            bg={panelBgStrong}
            borderRadius="3xl"
            p={{ base: 5, md: 6 }}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
          >
            {needsSetup ? (
              <Stack spacing={4}>
                <Badge alignSelf="start" colorScheme="orange" borderRadius="full" px={3} py={1}>
                  First-run setup
                </Badge>
                <Heading size="lg">Create the first administrator</Heading>
                <Text color={mutedText}>
                  This initializes leaf and establishes the first account that can manage users and
                  reviewer mappings.
                </Text>
                <FormControl>
                  <FormLabel>Admin email</FormLabel>
                  <Input
                    value={setupEmail}
                    onChange={(event) => setSetupEmail(event.target.value)}
                  />
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
                  <Input
                    value={setupToken}
                    onChange={(event) => setSetupToken(event.target.value)}
                  />
                </FormControl>
                <Button
                  colorScheme="leaf"
                  onClick={() =>
                    runSetup().catch((error) => toast({ status: 'error', title: String(error) }))
                  }
                >
                  Create First Admin
                </Button>
              </Stack>
            ) : (
              <Stack spacing={4}>
                <Badge alignSelf="start" colorScheme="green" borderRadius="full" px={3} py={1}>
                  Sign in to leaf
                </Badge>
                <Heading size="lg">Enter your workspace</Heading>
                <Text color={mutedText}>
                  Move from planning to review without jumping between disconnected utilities.
                </Text>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input value={email} onChange={(event) => setEmail(event.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </FormControl>
                <Button
                  colorScheme="leaf"
                  onClick={() =>
                    login().catch((error) => toast({ status: 'error', title: String(error) }))
                  }
                >
                  Login
                </Button>
                {oauthProviders.length > 0 && (
                  <>
                    <Divider />
                    <Text color={mutedText}>Or continue with OAuth</Text>
                    <Stack spacing={2}>
                      {oauthProviders.map((provider) => (
                        <Button
                          key={provider}
                          variant="outline"
                          onClick={() => loginWithProvider(provider)}
                        >
                          Continue with {provider[0]!.toUpperCase() + provider.slice(1)}
                        </Button>
                      ))}
                    </Stack>
                  </>
                )}
              </Stack>
            )}
          </Box>
        </GridItem>
      </Grid>
    );
  }

  function renderDashboard() {
    return (
      <Stack spacing={5}>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Stat
            bg={panelBgStrong}
            borderRadius="2xl"
            p={5}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
          >
            <StatLabel color={subtleText}>Active tracked items</StatLabel>
            <StatNumber>{items.length}</StatNumber>
          </Stat>
          <Stat
            bg={panelBgStrong}
            borderRadius="2xl"
            p={5}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
          >
            <StatLabel color={subtleText}>Projected checks this week</StatLabel>
            <StatNumber>{projectedWeekChecks}</StatNumber>
          </Stat>
          <Stat
            bg={panelBgStrong}
            borderRadius="2xl"
            p={5}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
          >
            <StatLabel color={subtleText}>Accountability network</StatLabel>
            <StatNumber>{user!.reviewTargets.length + user!.reviewers.length}</StatNumber>
          </Stat>
        </SimpleGrid>

        <Grid templateColumns={{ base: '1fr', xl: '1.45fr 0.95fr' }} gap={5}>
          <GridItem>
            <Box
              bg={panelBgStrong}
              borderRadius="3xl"
              p={6}
              border="1px solid"
              borderColor={panelBorder}
              boxShadow={statGlow}
            >
              <Flex justify="space-between" align="start" gap={4} mb={4}>
                <Box>
                  <Heading size="md">Upcoming Focus</Heading>
                  <Text mt={1} color={mutedText}>
                    The next set of routines most likely to define this week.
                  </Text>
                </Box>
                <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                  {items.length} active
                </Badge>
              </Flex>

              <Stack spacing={3}>
                {items.slice(0, 8).map((item) => (
                  <Flex
                    key={item.id}
                    justify="space-between"
                    align={{ base: 'start', md: 'center' }}
                    direction={{ base: 'column', md: 'row' }}
                    gap={3}
                    bg={panelBg}
                    borderRadius="2xl"
                    px={4}
                    py={4}
                    border="1px solid"
                    borderColor={panelBorder}
                  >
                    <Box>
                      <Text fontWeight="semibold">{item.title}</Text>
                      <Text color={mutedText} fontSize="sm">
                        {summarizeSchedule(item)}
                      </Text>
                    </Box>
                    <Badge
                      alignSelf={{ base: 'start', md: 'center' }}
                      colorScheme="orange"
                      borderRadius="full"
                      px={3}
                      py={1}
                    >
                      {item.category}
                    </Badge>
                  </Flex>
                ))}
                {items.length === 0 && (
                  <Text color={mutedText}>
                    No items yet. Add tracked items to populate upcoming activity.
                  </Text>
                )}
              </Stack>
            </Box>
          </GridItem>

          <GridItem>
            <Stack spacing={5}>
              <Box
                bg={panelBgStrong}
                borderRadius="3xl"
                p={6}
                border="1px solid"
                borderColor={panelBorder}
                boxShadow={statGlow}
              >
                <Heading size="md" mb={4}>
                  Goal Trend
                </Heading>
                <Stack spacing={3}>
                  {trendData.map((point) => (
                    <Box key={point.label}>
                      <Flex justify="space-between" mb={1}>
                        <Text fontSize="sm" color={mutedText}>
                          {point.label}
                        </Text>
                        <Text fontSize="sm" fontWeight="semibold">
                          {point.value}%
                        </Text>
                      </Flex>
                      <Box h="2.5" bg={progressTrackBg} borderRadius="full" overflow="hidden">
                        <Box
                          h="100%"
                          bgGradient={
                            adminMode
                              ? 'linear(to-r, clay.500, clay.300)'
                              : 'linear(to-r, leaf.600, clay.400)'
                          }
                          w={`${point.value}%`}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
                <Text mt={4} color={mutedText} fontSize="sm">
                  Trend is derived from scheduled workload coverage in your current item set.
                </Text>
              </Box>

              <Box
                bg={panelBgStrong}
                borderRadius="3xl"
                p={6}
                border="1px solid"
                borderColor={panelBorder}
                boxShadow={statGlow}
              >
                <Heading size="md" mb={4}>
                  Signals
                </Heading>
                <Stack spacing={3}>
                  <Flex justify="space-between">
                    <Text color={mutedText}>Digest cadence</Text>
                    <Text fontWeight="semibold">
                      {toDayName(Number(prefDay))}, {prefHour.padStart(2, '0')}:00
                    </Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color={mutedText}>Reviewers connected</Text>
                    <Text fontWeight="semibold">{user!.reviewers.length}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color={mutedText}>People you review</Text>
                    <Text fontWeight="semibold">{user!.reviewTargets.length}</Text>
                  </Flex>
                </Stack>
              </Box>
            </Stack>
          </GridItem>
        </Grid>

        <Box
          bg={panelBgStrong}
          borderRadius="3xl"
          p={6}
          border="1px solid"
          borderColor={panelBorder}
          boxShadow={statGlow}
        >
          <Heading size="md" mb={4}>
            People and Accountability
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
            <Box>
              <Text fontWeight="semibold" mb={3}>
                People you review
              </Text>
              <Stack spacing={3}>
                {user!.reviewTargets.map((entry) => (
                  <Flex
                    key={entry.reviewee.id}
                    justify="space-between"
                    align="center"
                    bg={panelBg}
                    borderRadius="2xl"
                    px={4}
                    py={3}
                  >
                    <Text>{entry.reviewee.name}</Text>
                    <Badge colorScheme="green" borderRadius="full" px={3} py={1}>
                      Connected
                    </Badge>
                  </Flex>
                ))}
                {user!.reviewTargets.length === 0 && (
                  <Text color={mutedText}>No review targets assigned.</Text>
                )}
              </Stack>
            </Box>
            <Box>
              <Text fontWeight="semibold" mb={3}>
                People reviewing you
              </Text>
              <Stack spacing={3}>
                {user!.reviewers.map((entry) => (
                  <Flex
                    key={entry.reviewer.id}
                    justify="space-between"
                    align="center"
                    bg={panelBg}
                    borderRadius="2xl"
                    px={4}
                    py={3}
                  >
                    <Text>{entry.reviewer.name}</Text>
                    <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                      Active reviewer
                    </Badge>
                  </Flex>
                ))}
                {user!.reviewers.length === 0 && (
                  <Text color={mutedText}>No reviewers connected yet.</Text>
                )}
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
          <Box
            bg={panelBgStrong}
            borderRadius="3xl"
            p={6}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
          >
            <Heading size="md" mb={3}>
              Weekly Digest Preferences
            </Heading>
            <Text color={mutedText} mb={4}>
              Set the time and timezone for the weekly summary reviewers and users will depend on.
            </Text>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Timezone</FormLabel>
                <Input
                  value={prefTimezone}
                  onChange={(event) => setPrefTimezone(event.target.value)}
                />
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
                colorScheme="leaf"
                onClick={() =>
                  updatePreferences().catch((error) =>
                    toast({ status: 'error', title: String(error) }),
                  )
                }
              >
                Save Preferences
              </Button>
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Stack spacing={5}>
            <Box
              bg={panelBgStrong}
              borderRadius="3xl"
              p={6}
              border="1px solid"
              borderColor={panelBorder}
              boxShadow={statGlow}
            >
              <Heading size="md" mb={3}>
                Invite Reviewer or Collaborator
              </Heading>
              <Text color={mutedText} mb={4}>
                Add another person to the loop directly from the account settings surface.
              </Text>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                  />
                </FormControl>
                {isAdmin && adminUsers.length > 0 && (
                  <FormControl>
                    <FormLabel>Invite for user</FormLabel>
                    <Select
                      value={targetUserId}
                      onChange={(event) => setTargetUserId(event.target.value)}
                    >
                      {adminUsers.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name} ({entry.email})
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <Button
                  colorScheme="leaf"
                  onClick={() =>
                    inviteReviewer().catch((error) =>
                      toast({ status: 'error', title: String(error) }),
                    )
                  }
                >
                  Send Invite
                </Button>
              </Stack>
            </Box>

            <Box
              bg={panelBgStrong}
              borderRadius="3xl"
              p={6}
              border="1px solid"
              borderColor={panelBorder}
              boxShadow={statGlow}
            >
              <Heading size="md" mb={3}>
                Relationship Snapshot
              </Heading>
              <SimpleGrid columns={2} spacing={4}>
                <Stat>
                  <StatLabel color={subtleText}>Reviewing you</StatLabel>
                  <StatNumber>{user!.reviewers.length}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel color={subtleText}>You review</StatLabel>
                  <StatNumber>{user!.reviewTargets.length}</StatNumber>
                </Stat>
              </SimpleGrid>
            </Box>
          </Stack>
        </GridItem>
      </Grid>
    );
  }

  function renderItems() {
    return (
      <Grid templateColumns={{ base: '1fr', xl: '1.08fr 0.92fr' }} gap={5}>
        <GridItem>
          <Box
            bg={panelBgStrong}
            borderRadius="3xl"
            p={6}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
          >
            <Heading size="md" mb={3}>
              Manage Tracked Items
            </Heading>
            <Text color={mutedText} mb={5}>
              Compose the behavior of each tracked routine, from timing model to notification
              persistence.
            </Text>
            <Stack spacing={4}>
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

              <Box
                bg={panelBg}
                borderRadius="2xl"
                p={4}
                border="1px solid"
                borderColor={panelBorder}
              >
                <HStack justify="space-between" align="center" mb={3}>
                  <Box>
                    <Text fontWeight="semibold">Schedules</Text>
                    <Text color={mutedText} fontSize="sm">
                      You can combine multiple schedules on one item.
                    </Text>
                  </Box>
                  <Button size="sm" variant="outline" onClick={addSchedule}>
                    Add Schedule
                  </Button>
                </HStack>

                <Stack spacing={4}>
                  {draftSchedules.map((draft, scheduleIndex) => (
                    <Box
                      key={`schedule-${scheduleIndex}`}
                      border="1px solid"
                      borderColor={panelBorder}
                      borderRadius="2xl"
                      p={4}
                    >
                      <Stack spacing={3}>
                        <HStack justify="space-between" align="center">
                          <Badge
                            colorScheme={scheduleIndex % 2 === 0 ? 'green' : 'orange'}
                            borderRadius="full"
                            px={3}
                            py={1}
                          >
                            Schedule {scheduleIndex + 1}
                          </Badge>
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
                                    onChange={(event) =>
                                      updateDailyTime(scheduleIndex, timeIndex, event.target.value)
                                    }
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
                              <Button
                                size="sm"
                                variant="outline"
                                alignSelf="start"
                                onClick={() => addDailyTime(scheduleIndex)}
                              >
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
                              <Box
                                border="1px solid"
                                borderColor={panelBorder}
                                borderRadius="xl"
                                p={2}
                                bg={panelBg}
                              >
                                <DayPicker
                                  mode="multiple"
                                  selected={draft.customDates
                                    .map((entry) => new Date(entry))
                                    .filter((entry) => !Number.isNaN(entry.valueOf()))}
                                  onSelect={(selectedDates) => {
                                    const nextDates = selectedDates?.map((entry) => {
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
              </Box>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <FormControl
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  bg={panelBg}
                  borderRadius="2xl"
                  px={4}
                  py={3}
                >
                  <FormLabel mb={0}>Notifications</FormLabel>
                  <Switch
                    isChecked={notificationEnabled}
                    onChange={(event) => setNotificationEnabled(event.target.checked)}
                  />
                </FormControl>
                <FormControl
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  bg={panelBg}
                  borderRadius="2xl"
                  px={4}
                  py={3}
                >
                  <FormLabel mb={0}>Hard to dismiss</FormLabel>
                  <Switch
                    isChecked={hardToDismiss}
                    onChange={(event) => setHardToDismiss(event.target.checked)}
                  />
                </FormControl>
                <FormControl bg={panelBg} borderRadius="2xl" px={4} py={3}>
                  <FormLabel>Repeat min</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    value={repeatMinutes}
                    onChange={(event) => setRepeatMinutes(event.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              <Button
                colorScheme="leaf"
                onClick={() =>
                  addItem().catch((error) => toast({ status: 'error', title: String(error) }))
                }
              >
                Save Item
              </Button>
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Box
            bg={panelBgStrong}
            borderRadius="3xl"
            p={6}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
            h="100%"
          >
            <Heading size="md" mb={3}>
              Existing Items
            </Heading>
            <Text color={mutedText} mb={4}>
              Live inventory of the routines already active in leaf.
            </Text>
            <Stack spacing={3}>
              {items.map((item) => (
                <Box
                  key={item.id}
                  border="1px solid"
                  borderColor={panelBorder}
                  borderRadius="2xl"
                  p={4}
                  bg={panelBg}
                >
                  <HStack justify="space-between" align="start">
                    <Box>
                      <Text fontWeight="semibold">{item.title}</Text>
                      <Text color={mutedText} fontSize="sm">
                        {summarizeSchedule(item)}
                      </Text>
                    </Box>
                    <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                      {item.category}
                    </Badge>
                  </HStack>
                </Box>
              ))}
              {items.length === 0 && <Text color={mutedText}>No items configured yet.</Text>}
            </Stack>
          </Box>
        </GridItem>
      </Grid>
    );
  }

  function renderAdmin() {
    if (!isAdmin) {
      return (
        <Alert
          status="warning"
          borderRadius="2xl"
          bg={panelBgStrong}
          border="1px solid"
          borderColor={panelBorder}
        >
          <AlertIcon />
          Admin role required.
        </Alert>
      );
    }

    return (
      <Stack spacing={5}>
        <Box
          bgGradient={modeGradient}
          borderRadius="3xl"
          p={6}
          border="1px solid"
          borderColor={panelBorder}
          boxShadow={statGlow}
        >
          <HStack
            justify="space-between"
            align={{ base: 'start', md: 'center' }}
            flexWrap="wrap"
            spacing={4}
          >
            <Box>
              <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                Administrative mode
              </Badge>
              <Heading size="lg" mt={3}>
                leaf control room
              </Heading>
              <Text mt={2} color={mutedText} maxW="42rem">
                This area intentionally shifts visual tone to signal elevated privileges and
                cross-user actions.
              </Text>
            </Box>
            <Box
              bg="whiteAlpha.420"
              _dark={{ bg: 'whiteAlpha.120' }}
              borderRadius="2xl"
              px={4}
              py={3}
            >
              <Text fontSize="sm" color={mutedText}>
                Active users
              </Text>
              <Text fontWeight="bold" fontSize="2xl">
                {adminUsers.length}
              </Text>
            </Box>
          </HStack>
        </Box>

        <Grid templateColumns={{ base: '1fr', xl: '1.05fr 0.95fr' }} gap={5}>
          <GridItem>
            <Box
              bg={panelBgStrong}
              borderRadius="3xl"
              p={6}
              border="1px solid"
              borderColor={panelBorder}
              boxShadow={statGlow}
            >
              <Heading size="md" mb={3}>
                User Management
              </Heading>
              <Text color={mutedText} mb={4}>
                Review role assignments and account identities before making governance changes.
              </Text>
              <Stack spacing={3}>
                {adminUsers.map((entry) => (
                  <Flex
                    key={entry.id}
                    justify="space-between"
                    align="center"
                    bg={panelBg}
                    borderRadius="2xl"
                    px={4}
                    py={4}
                  >
                    <Box>
                      <Text fontWeight="semibold">{entry.name}</Text>
                      <Text fontSize="sm" color={mutedText}>
                        {entry.email}
                      </Text>
                    </Box>
                    <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                      {entry.roles.map((role) => role.role).join(', ')}
                    </Badge>
                  </Flex>
                ))}
              </Stack>
            </Box>
          </GridItem>

          <GridItem>
            <Box
              bg={panelBgStrong}
              borderRadius="3xl"
              p={6}
              border="1px solid"
              borderColor={panelBorder}
              boxShadow={statGlow}
            >
              <Heading size="md" mb={3}>
                Reviewer Mapping
              </Heading>
              <Text color={mutedText} mb={4}>
                Enter reviewer-assignment mode for the whole workspace. These changes affect
                accountability flows globally.
              </Text>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Reviewer</FormLabel>
                  <Select
                    value={adminReviewerId}
                    onChange={(event) => setAdminReviewerId(event.target.value)}
                  >
                    {adminUsers.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.email})
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Reviewee</FormLabel>
                  <Select
                    value={adminRevieweeId}
                    onChange={(event) => setAdminRevieweeId(event.target.value)}
                  >
                    {adminUsers.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.email})
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  colorScheme="orange"
                  onClick={() =>
                    adminAssignReviewer().catch((error) =>
                      toast({ status: 'error', title: String(error) }),
                    )
                  }
                >
                  Save Mapping
                </Button>
              </Stack>
            </Box>
          </GridItem>
        </Grid>
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
    <Box minH="100vh" bg={appBg} position="relative">
      <Box position="absolute" inset="0" bgGradient={overlayGradient} pointerEvents="none" />

      <Container maxW="container.2xl" py={{ base: 5, md: 7 }} position="relative">
        <Stack spacing={6}>
          <Flex
            justify="space-between"
            align={{ base: 'start', md: 'center' }}
            direction={{ base: 'column', md: 'row' }}
            gap={4}
            bg={shellBg}
            backdropFilter="blur(16px)"
            border="1px solid"
            borderColor={shellBorder}
            borderRadius="3xl"
            px={{ base: 5, md: 6 }}
            py={{ base: 4, md: 5 }}
            boxShadow={statGlow}
          >
            <HStack spacing={4}>
              <Box
                bg={adminMode ? 'clay.500' : 'whiteAlpha.700'}
                _dark={{ bg: adminMode ? 'clay.500' : 'whiteAlpha.120' }}
                p={3}
                borderRadius="2xl"
              >
                <Image src="/leaf.svg" alt="leaf logo" boxSize="42px" />
              </Box>
              <Box>
                <HStack spacing={3} align="center" mb={1}>
                  <Heading size="md">leaf</Heading>
                  <Badge
                    colorScheme={adminMode ? 'orange' : 'green'}
                    borderRadius="full"
                    px={3}
                    py={1}
                  >
                    {adminMode ? 'Admin mode' : 'Routine workspace'}
                  </Badge>
                </HStack>
                <Text color={mutedText}>
                  Schedules, accountability, and review in a calmer product shell.
                </Text>
              </Box>
            </HStack>

            <HStack spacing={3}>
              <IconButton
                aria-label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                variant="outline"
                borderRadius="full"
                onClick={toggleColorMode}
              />
              {loggedIn && (
                <Button variant="outline" borderRadius="full" onClick={signOut}>
                  Sign out
                </Button>
              )}
            </HStack>
          </Flex>

          {!loggedIn ? (
            renderAuthShell()
          ) : !user ? (
            <Box
              bg={panelBgStrong}
              borderRadius="3xl"
              p={6}
              boxShadow={statGlow}
              border="1px solid"
              borderColor={panelBorder}
            >
              <Heading size="md" mb={2}>
                Session needs attention
              </Heading>
              <Text color={mutedText} mb={4}>
                We could not load your account data. This can happen with an expired token,
                incorrect API URL, or a temporary connection issue.
              </Text>
              {sessionLoadError && (
                <Text fontSize="sm" color="red.400" mb={4}>
                  {sessionLoadError}
                </Text>
              )}
              <HStack>
                <Button
                  onClick={() =>
                    refreshMe()
                      .then(() => setSessionLoadError(null))
                      .catch((error) => setSessionLoadError(String(error)))
                  }
                >
                  Retry
                </Button>
                <Button variant="outline" onClick={signOut}>
                  Sign out
                </Button>
              </HStack>
            </Box>
          ) : (
            <Grid templateColumns={{ base: '1fr', lg: '300px minmax(0, 1fr)' }} gap={5}>
              <GridItem>
                <Box
                  bg={shellBg}
                  backdropFilter="blur(16px)"
                  borderRadius="3xl"
                  p={4}
                  border="1px solid"
                  borderColor={shellBorder}
                  position={{ lg: 'sticky' }}
                  top={{ lg: 6 }}
                  boxShadow={statGlow}
                >
                  <Stack spacing={4}>
                    <Box
                      bgGradient={modeGradient}
                      borderRadius="2xl"
                      px={4}
                      py={4}
                      border="1px solid"
                      borderColor={panelBorder}
                    >
                      <Text
                        fontSize="xs"
                        textTransform="uppercase"
                        letterSpacing="0.12em"
                        color={subtleText}
                      >
                        {pageEyebrow}
                      </Text>
                      <Heading size="md" mt={2}>
                        {pageTitle}
                      </Heading>
                      <Text mt={2} fontSize="sm" color={mutedText}>
                        {pageSummary}
                      </Text>
                    </Box>

                    <Stack spacing={2}>
                      {navItems
                        .filter((item) => item.key !== 'admin' || isAdmin)
                        .map((item) => (
                          <NavButton
                            key={item.key}
                            label={item.label}
                            summary={item.summary}
                            to={item.path}
                            active={currentPage === item.key}
                            accent={accent}
                          />
                        ))}
                    </Stack>

                    <Divider />

                    <Box>
                      <Text
                        fontSize="xs"
                        textTransform="uppercase"
                        letterSpacing="0.12em"
                        color={subtleText}
                      >
                        Account
                      </Text>
                      <Text mt={2} fontWeight="semibold">
                        {user.name || user.email}
                      </Text>
                      <Text color={mutedText} fontSize="sm">
                        {user.email}
                      </Text>
                      <Text color={mutedText} fontSize="sm" mt={2}>
                        Digest: {toDayName(Number(prefDay))} at {prefHour.padStart(2, '0')}:00
                      </Text>
                    </Box>
                  </Stack>
                </Box>
              </GridItem>

              <GridItem>{renderPage()}</GridItem>
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
