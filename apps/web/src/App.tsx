import {
  Alert,
  AlertIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Container,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Portal,
  Select,
  SimpleGrid,
  Radio,
  RadioGroup,
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
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import './app.css';
import type { ScheduleKind } from '@leaf/shared';
import { apiFetch, clearToken, getToken, setRefreshToken, setToken } from './api';

type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
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

const categoryOptions = [
  { value: 'homework', label: 'Schoolwork' },
  { value: 'health', label: 'Medicine or supplements' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'other', label: 'Other routine' },
];

const categoryDefaultTitles: Record<string, string> = {
  homework: 'Finish math homework',
  health: 'Take evening supplement',
  exercise: 'Go for a walk',
  other: 'Water the plants',
};

const scheduleKindOptions: Array<{ value: SingleScheduleKind; label: string; help: string }> = [
  {
    value: 'DAILY',
    label: 'Every day',
    help: 'Use one or more times each day.',
  },
  {
    value: 'WEEKLY',
    label: 'Selected weekdays',
    help: 'Choose the days of the week that apply.',
  },
  {
    value: 'INTERVAL_DAYS',
    label: 'Every few days',
    help: 'Repeat after a fixed number of days.',
  },
  {
    value: 'CUSTOM_DATES',
    label: 'Specific dates',
    help: 'Hand-pick dates on the calendar.',
  },
  {
    value: 'ONE_TIME',
    label: 'One time',
    help: 'Schedule a single occurrence.',
  },
];

const appNavItems: Array<{ key: PageKey; path: string; label: string }> = [
  { key: 'dashboard', path: '/dashboard', label: 'Overview' },
  { key: 'items', path: '/items', label: 'Tracked Items' },
];

const accountNavItems: Array<{ key: PageKey; path: string; label: string; adminOnly?: boolean }> = [
  { key: 'profile', path: '/profile', label: 'Preferences' },
  { key: 'admin', path: '/admin', label: 'Admin', adminOnly: true },
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

function getCategoryLabel(value: string): string {
  return categoryOptions.find((option) => option.value === value)?.label ?? value;
}

function getDefaultTitle(value: string): string {
  return categoryDefaultTitles[value] ?? 'Add routine';
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

function NavButton({
  label,
  to,
  active,
  accent,
}: {
  label: string;
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
      py={3}
      px={4}
      variant="ghost"
      borderRadius="2xl"
      bg={active ? activeBg : 'transparent'}
      color={active ? 'white' : 'inherit'}
      boxShadow={active ? activeShadow : 'none'}
      _hover={{ bg: active ? activeBg : 'blackAlpha.100', transform: 'translateX(2px)' }}
      _dark={{ _hover: { bg: active ? activeBg : 'whiteAlpha.140' } }}
      transition="0.18s ease"
    >
      <Stack spacing={0.5} align="start">
        <Text fontWeight="semibold">{label}</Text>
      </Stack>
    </Button>
  );
}

function UserGlyph() {
  return (
    <Icon viewBox="0 0 24 24" boxSize={5}>
      <path
        fill="currentColor"
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
      />
    </Icon>
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

  const [title, setTitle] = useState(getDefaultTitle('health'));
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
  const [profileName, setProfileName] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);

  const loggedIn = Boolean(getToken());

  const isAdmin = useMemo(
    () => user?.roles.some((entry) => entry.role === 'ADMIN') ?? false,
    [user?.roles],
  );

  const projectedWeekChecks = useMemo(
    () => items.reduce((total, item) => total + projectedChecksPerWeek(item), 0),
    [items],
  );
  const relationshipsCount = useMemo(
    () => (user ? user.reviewTargets.length + user.reviewers.length : 0),
    [user],
  );
  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return categoryOptions
      .map((option) => ({ label: option.label, count: counts.get(option.value) ?? 0 }))
      .filter((entry) => entry.count > 0);
  }, [items]);
  const digestSummary = `${toDayName(Number(prefDay))} at ${prefHour.padStart(2, '0')}:00`;

  const currentPage: PageKey = useMemo(() => {
    if (startsWithPath(location.pathname, '/profile')) return 'profile';
    if (startsWithPath(location.pathname, '/items')) return 'items';
    if (startsWithPath(location.pathname, '/admin')) return 'admin';
    return 'dashboard';
  }, [location.pathname]);

  const accountMode = currentPage === 'profile' || currentPage === 'admin';
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
  const inputBg = useColorModeValue('rgba(255, 251, 246, 0.94)', 'rgba(16, 21, 21, 0.92)');
  const iconBg = useColorModeValue('rgba(255, 248, 240, 0.84)', 'rgba(67, 90, 73, 0.42)');
  const accountButtonBg = useColorModeValue(
    accountMode ? 'rgba(241, 225, 216, 0.96)' : 'rgba(239, 229, 214, 0.96)',
    accountMode ? 'rgba(55, 35, 29, 0.96)' : 'rgba(30, 39, 39, 0.96)',
  );
  const accountButtonBorder = useColorModeValue(
    accountMode ? 'rgba(192, 88, 40, 0.24)' : 'rgba(79, 118, 88, 0.28)',
    accountMode ? 'rgba(242, 215, 199, 0.14)' : 'rgba(211, 226, 213, 0.16)',
  );
  const accountIconColor = useColorModeValue('leaf.700', 'leaf.100');
  const accountMenuBg = useColorModeValue(
    accountMode ? 'rgba(255, 246, 241, 0.98)' : 'rgba(255, 252, 246, 0.98)',
    accountMode ? 'rgba(42, 28, 24, 0.98)' : 'rgba(23, 29, 29, 0.98)',
  );
  const accountMenuBorder = useColorModeValue(
    accountMode ? 'rgba(192, 88, 40, 0.18)' : 'rgba(161, 129, 107, 0.18)',
    accountMode ? 'rgba(242, 215, 199, 0.14)' : 'rgba(222, 212, 194, 0.12)',
  );
  const accountMenuHoverBg = useColorModeValue(
    'rgba(122, 97, 77, 0.10)',
    'rgba(255, 255, 255, 0.08)',
  );
  const accountMenuDivider = useColorModeValue(
    accountMode ? 'rgba(192, 88, 40, 0.14)' : 'rgba(161, 129, 107, 0.14)',
    accountMode ? 'rgba(242, 215, 199, 0.12)' : 'rgba(222, 212, 194, 0.10)',
  );
  const brandTextColor = useColorModeValue('#1e2a23', '#eef4ef');
  const sectionBg = useColorModeValue('rgba(250, 245, 237, 0.92)', 'rgba(18, 24, 24, 0.92)');
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
  const modeGradient = accountMode ? adminModeGradient : heroGradient;
  const progressTrackBg = useColorModeValue('rgba(108, 92, 80, 0.10)', 'rgba(255, 255, 255, 0.08)');
  const accent = accountMode ? 'clay' : 'leaf';
  const pageEyebrow =
    currentPage === 'dashboard'
      ? 'Dashboard'
      : currentPage === 'items'
        ? 'Routines'
        : currentPage === 'profile'
          ? 'Account'
          : 'Admin';
  const pageTitle =
    currentPage === 'dashboard'
      ? 'Overview'
      : currentPage === 'items'
        ? 'Tracked Items'
        : currentPage === 'profile'
          ? 'Preferences'
          : 'Admin';
  const pageSummary =
    currentPage === 'dashboard'
      ? 'Your routines, workload, and people at a glance.'
      : currentPage === 'items'
        ? 'Create, schedule, and refine routines.'
        : currentPage === 'profile'
          ? 'Account details, digest timing, invites, and reviewers.'
          : 'User roles and reviewer assignments.';

  function renderPageIntro() {
    return (
      <Flex
        justify="space-between"
        align={{ base: 'start', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        gap={4}
      >
        <Box>
          <Text
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="0.16em"
            color={subtleText}
          >
            {pageEyebrow}
          </Text>
          <Heading size="lg" mt={2}>
            {pageTitle}
          </Heading>
          <Text mt={2} color={mutedText} maxW="40rem">
            {pageSummary}
          </Text>
        </Box>
        {currentPage === 'dashboard' && (
          <Box
            bg={panelBgStrong}
            borderRadius="2xl"
            px={4}
            py={3}
            border="1px solid"
            borderColor={panelBorder}
            minW={{ md: '220px' }}
          >
            <Text fontSize="sm" color={mutedText}>
              Weekly digest
            </Text>
            <Text mt={1} fontWeight="semibold">
              {digestSummary}
            </Text>
          </Box>
        )}
      </Flex>
    );
  }

  async function refreshSetup() {
    const status = await apiFetch<{ needsSetup: boolean }>('/setup/status');
    setNeedsSetup(status.needsSetup);
  }

  async function refreshMe() {
    const me = await apiFetch<User>('/me');
    setUser(me);
    setProfileName(me.name);
    setProfileAvatarUrl(me.avatarUrl ?? null);
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
    setTitle(getDefaultTitle(category));
    setDraftSchedules([createDraftSchedule()]);
    await refreshMe();
  }

  function onCategoryChange(nextCategory: string) {
    setCategory(nextCategory);
    setTitle((currentTitle) => {
      const trimmedTitle = currentTitle.trim();
      const currentDefault = getDefaultTitle(category);
      if (trimmedTitle === '' || trimmedTitle === currentDefault) {
        return getDefaultTitle(nextCategory);
      }
      return currentTitle;
    });
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
        name: profileName,
        avatarUrl: profileAvatarUrl,
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
    setProfileName('');
    setProfileAvatarUrl(null);
    setSessionLoadError(null);
  }

  async function onAvatarSelected(file: File | null) {
    if (!file) return;
    if (file.size > 1_500_000) {
      toast({ status: 'error', title: 'Use an image smaller than 1.5 MB' });
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.readAsDataURL(file);
    });

    setProfileAvatarUrl(dataUrl);
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
                <Image src="/leaf.svg" alt="leaf logo" boxSize="46px" />
                <Box>
                  <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
                    leaf
                  </Text>
                  <Heading size="md" mt={2}>
                    Sign in and keep moving.
                  </Heading>
                </Box>
              </HStack>

              <Box>
                <Heading size="2xl" lineHeight="1.05" maxW="16ch">
                  Clear routines, simple accountability, no extra noise.
                </Heading>
                <Text mt={4} maxW="34rem" color={mutedText}>
                  The dashboard should answer what matters now, not explain itself.
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
                    Routines
                  </Text>
                  <Text mt={2} fontWeight="semibold">
                    One-time, repeating, and custom schedules live in one system.
                  </Text>
                </Box>
                <Box bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.90' }} borderRadius="2xl" p={4}>
                  <Text
                    fontSize="xs"
                    textTransform="uppercase"
                    letterSpacing="0.12em"
                    color={subtleText}
                  >
                    People
                  </Text>
                  <Text mt={2} fontWeight="semibold">
                    Reviewers and digests stay tied to the routines they support.
                  </Text>
                </Box>
                <Box bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.90' }} borderRadius="2xl" p={4}>
                  <Text
                    fontSize="xs"
                    textTransform="uppercase"
                    letterSpacing="0.12em"
                    color={subtleText}
                  >
                    Clarity
                  </Text>
                  <Text mt={2} fontWeight="semibold">
                    The interface favors status and actions over description.
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
              <Box
                as="form"
                onSubmit={(event: FormEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  runSetup().catch((error) => toast({ status: 'error', title: String(error) }));
                }}
              >
                <Stack spacing={4}>
                <Badge alignSelf="start" colorScheme="orange" borderRadius="full" px={3} py={1}>
                  First-run setup
                </Badge>
                <Heading size="lg">Create the first administrator</Heading>
                <Text color={mutedText}>
                  Create the first account and open the workspace.
                </Text>
                <FormControl>
                  <FormLabel>Admin email</FormLabel>
                  <Input
                    bg={inputBg}
                    value={setupEmail}
                    onChange={(event) => setSetupEmail(event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <Input
                    bg={inputBg}
                    type="password"
                    value={setupPassword}
                    onChange={(event) => setSetupPassword(event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Setup token (optional)</FormLabel>
                  <Input
                    bg={inputBg}
                    value={setupToken}
                    onChange={(event) => setSetupToken(event.target.value)}
                  />
                  <FormHelperText color={mutedText}>
                    Only needed if your server requires a protected first-run token.
                  </FormHelperText>
                </FormControl>
                <Button
                  colorScheme="leaf"
                  type="submit"
                >
                  Create First Admin
                </Button>
                </Stack>
              </Box>
            ) : (
              <Box
                as="form"
                onSubmit={(event: FormEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  login().catch((error) => toast({ status: 'error', title: String(error) }));
                }}
              >
                <Stack spacing={4}>
                <Badge alignSelf="start" colorScheme="green" borderRadius="full" px={3} py={1}>
                  Sign in
                </Badge>
                <Heading size="lg">Enter your workspace</Heading>
                <Text color={mutedText}>
                  Use your email and password to continue.
                </Text>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    bg={inputBg}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <Input
                    bg={inputBg}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </FormControl>
                <Button
                  colorScheme="leaf"
                  type="submit"
                >
                  Sign in
                </Button>
                {oauthProviders.length > 0 && (
                  <>
                    <Divider />
                    <Text color={mutedText}>Or continue with another sign-in method</Text>
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
              </Box>
            )}
          </Box>
        </GridItem>
      </Grid>
    );
  }

  function renderDashboard() {
    const nextAction =
      items.length === 0
        ? {
            title: 'Create your first routine',
            body: 'Start by adding a tracked item with a schedule and reminder settings.',
            to: '/items',
            label: 'Add a routine',
          }
        : relationshipsCount === 0
          ? {
              title: 'Connect another person',
              body: 'Add a reviewer or invite someone who should receive accountability updates.',
              to: '/profile',
              label: 'Open preferences',
            }
          : {
              title: 'Review your digest timing',
              body: `Your weekly digest is set for ${digestSummary}. Change it if that is not the right review moment.`,
              to: '/profile',
              label: 'Manage digest',
            };

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
            <StatLabel color={subtleText}>Scheduled touches this week</StatLabel>
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
            <StatLabel color={subtleText}>People connected</StatLabel>
            <StatNumber>{relationshipsCount}</StatNumber>
          </Stat>
        </SimpleGrid>

        <Grid templateColumns={{ base: '1fr', xl: '1.2fr 0.8fr' }} gap={5}>
          <GridItem>
            <Stack spacing={5}>
              <Box
                bgGradient={modeGradient}
                borderRadius="3xl"
                p={6}
                border="1px solid"
                borderColor={panelBorder}
                boxShadow={statGlow}
              >
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
                  Focus
                </Text>
                <Heading size="lg" mt={2}>
                  {nextAction.title}
                </Heading>
                <Text mt={3} maxW="32rem" color={mutedText}>
                  {nextAction.body}
                </Text>
                <Button as={RouterLink} to={nextAction.to} mt={5} colorScheme="leaf" size="sm">
                  {nextAction.label}
                </Button>
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
                  Active Routines
                </Heading>
                <Stack spacing={3}>
                  {items.slice(0, 5).map((item) => (
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
                    >
                      <Box>
                        <Text fontWeight="semibold">{item.title}</Text>
                        <Text color={mutedText} fontSize="sm">
                          {summarizeSchedule(item)}
                        </Text>
                      </Box>
                      <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                        {getCategoryLabel(item.category)}
                      </Badge>
                    </Flex>
                  ))}
                  {items.length === 0 && (
                    <Text color={mutedText}>No routines yet. Add one from Tracked Items.</Text>
                  )}
                </Stack>
              </Box>
            </Stack>
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
                <Heading size="md" mb={4}>Routine Mix</Heading>
                <Stack spacing={3}>
                  {categoryBreakdown.map((entry) => (
                    <Flex
                      key={entry.label}
                      justify="space-between"
                      align="center"
                      bg={panelBg}
                      borderRadius="2xl"
                      px={4}
                      py={3}
                    >
                      <Text>{entry.label}</Text>
                      <Badge colorScheme="green" borderRadius="full" px={3} py={1}>
                        {entry.count}
                      </Badge>
                    </Flex>
                  ))}
                  {categoryBreakdown.length === 0 && (
                    <Text color={mutedText}>No routines yet. Add one from Tracked Items.</Text>
                  )}
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
                <Heading size="md" mb={4}>People</Heading>
                <Stack spacing={3}>
                  <Flex justify="space-between" align="center" bg={panelBg} borderRadius="2xl" px={4} py={3}>
                    <Text color={mutedText}>Reviewers</Text>
                    <Text fontWeight="semibold">{user!.reviewers.length}</Text>
                  </Flex>
                  <Flex justify="space-between" align="center" bg={panelBg} borderRadius="2xl" px={4} py={3}>
                    <Text color={mutedText}>People you review</Text>
                    <Text fontWeight="semibold">{user!.reviewTargets.length}</Text>
                  </Flex>
                  <Text color={mutedText} fontSize="sm">
                    Manage invites and account relationships from Preferences.
                  </Text>
                </Stack>
              </Box>
            </Stack>
          </GridItem>
        </Grid>

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={5}>
          <Box
            bg={panelBgStrong}
            borderRadius="3xl"
            p={6}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
          >
            <Heading size="md" mb={4}>
              People You Review
            </Heading>
            <Stack spacing={3}>
              {user!.reviewTargets.slice(0, 4).map((entry) => (
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
                <Text color={mutedText}>No review assignments yet.</Text>
              )}
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
            <Heading size="md" mb={4}>
              Reviewers
            </Heading>
            <Stack spacing={3}>
              {user!.reviewers.slice(0, 4).map((entry) => (
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
                    Active
                  </Badge>
                </Flex>
              ))}
              {user!.reviewers.length === 0 && (
                <Text color={mutedText}>No reviewers connected yet.</Text>
              )}
            </Stack>
          </Box>
        </Grid>
      </Stack>
    );
  }

  function renderProfile() {
    return (
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
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
                Profile
              </Heading>
              <Stack spacing={4}>
                <HStack spacing={4} align="center">
                  <Avatar size="xl" name={profileName || user?.email} src={profileAvatarUrl ?? undefined} />
                  <Stack spacing={2}>
                    <Button as="label" variant="outline" cursor="pointer">
                      Upload photo
                      <Input
                        display="none"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(event) => {
                          onAvatarSelected(event.target.files?.[0] ?? null).catch((error) =>
                            toast({ status: 'error', title: String(error) }),
                          );
                          event.target.value = '';
                        }}
                      />
                    </Button>
                    {profileAvatarUrl && (
                      <Button variant="ghost" size="sm" onClick={() => setProfileAvatarUrl(null)}>
                        Remove photo
                      </Button>
                    )}
                  </Stack>
                </HStack>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input
                    bg={inputBg}
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input bg={inputBg} value={user?.email ?? ''} isReadOnly />
                </FormControl>
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
              <Heading size="md" mb={4}>
                Digest
              </Heading>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Timezone</FormLabel>
                  <Input
                    bg={inputBg}
                    value={prefTimezone}
                    onChange={(event) => setPrefTimezone(event.target.value)}
                  />
                  <FormHelperText color={mutedText}>
                    Use an IANA timezone such as `America/Los_Angeles`.
                  </FormHelperText>
                </FormControl>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel>Day</FormLabel>
                    <Select bg={inputBg} value={prefDay} onChange={(event) => setPrefDay(event.target.value)}>
                      {weekdayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Time</FormLabel>
                    <Select bg={inputBg} value={prefHour} onChange={(event) => setPrefHour(event.target.value)}>
                      {Array.from({ length: 24 }, (_, hour) => hour).map((hour) => (
                        <option key={hour} value={hour}>
                          {hour.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </SimpleGrid>
                <Button
                  colorScheme="leaf"
                  alignSelf="start"
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
          </Stack>
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
                Invite
              </Heading>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    bg={inputBg}
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                  />
                </FormControl>
                {isAdmin && adminUsers.length > 0 && (
                  <FormControl>
                    <FormLabel>Send invite for</FormLabel>
                    <Select
                      bg={inputBg}
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
                  alignSelf="start"
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
                Relationships
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
              Tracked Items
            </Heading>
            <Stack spacing={4}>
              <Box bg={sectionBg} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
                <Text fontWeight="semibold" mb={1}>
                  1. Name the routine
                </Text>
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel>Routine name</FormLabel>
                    <Input
                      bg={inputBg}
                      placeholder={getDefaultTitle(category)}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Type of routine</FormLabel>
                    <RadioGroup value={category} onChange={onCategoryChange}>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                        {categoryOptions.map((option) => (
                          <Box
                            key={option.value}
                            as="label"
                            bg={panelBg}
                            border="1px solid"
                            borderColor={category === option.value ? 'leaf.500' : panelBorder}
                            borderRadius="xl"
                            px={4}
                            py={3}
                            cursor="pointer"
                          >
                            <Radio value={option.value} colorScheme="leaf">
                              {option.label}
                            </Radio>
                          </Box>
                        ))}
                      </SimpleGrid>
                    </RadioGroup>
                  </FormControl>
                </Stack>
              </Box>

              <Box
                bg={sectionBg}
                borderRadius="2xl"
                p={4}
                border="1px solid"
                borderColor={panelBorder}
              >
                <HStack justify="space-between" align="center" mb={3}>
                  <Box>
                    <Text fontWeight="semibold">2. Set the cadence</Text>
                  </Box>
                  <Button size="sm" variant="outline" onClick={addSchedule}>
                    Add another schedule
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
                          <FormLabel>Schedule label (optional)</FormLabel>
                          <Input
                            bg={inputBg}
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
                          <FormLabel>Cadence</FormLabel>
                          <RadioGroup
                            value={draft.kind}
                            onChange={(event) =>
                              updateDraftSchedule(scheduleIndex, (current) => ({
                                ...current,
                                kind: event as SingleScheduleKind,
                              }))
                            }
                          >
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                              {scheduleKindOptions.map((option) => (
                                <Box
                                  key={option.value}
                                  as="label"
                                  bg={panelBg}
                                  border="1px solid"
                                  borderColor={draft.kind === option.value ? 'leaf.500' : panelBorder}
                                  borderRadius="xl"
                                  px={4}
                                  py={3}
                                  cursor="pointer"
                                >
                                  <Stack spacing={1}>
                                    <Radio value={option.value} colorScheme="leaf">
                                      {option.label}
                                    </Radio>
                                    <Text color={mutedText} fontSize="sm" pl={6}>
                                      {option.help}
                                    </Text>
                                  </Stack>
                                </Box>
                              ))}
                            </SimpleGrid>
                          </RadioGroup>
                        </FormControl>

                        {draft.kind === 'ONE_TIME' && (
                          <FormControl>
                            <FormLabel>When should it happen?</FormLabel>
                            <Input
                              bg={inputBg}
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
                            <FormLabel>Times of day</FormLabel>
                            <Stack spacing={2}>
                              {draft.dailyTimes.map((time, timeIndex) => (
                                <HStack key={`daily-${scheduleIndex}-${timeIndex}`}>
                                  <Input
                                    bg={inputBg}
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
                                Add time
                              </Button>
                            </Stack>
                          </FormControl>
                        )}

                        {draft.kind === 'WEEKLY' && (
                          <FormControl>
                            <FormLabel>Days of the week</FormLabel>
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
                              <FormLabel>Repeat every</FormLabel>
                              <Input
                                bg={inputBg}
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
                              <FormHelperText color={mutedText}>days</FormHelperText>
                            </FormControl>
                            <FormControl>
                              <FormLabel>Start counting from</FormLabel>
                              <Input
                                bg={inputBg}
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
                            <FormLabel>Chosen dates</FormLabel>
                            <Stack spacing={2}>
                              <Box
                                className="leaf-calendar"
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
                                    bg={inputBg}
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
                                Add date
                              </Button>
                            </Stack>
                          </FormControl>
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box bg={sectionBg} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
                <Text fontWeight="semibold" mb={1}>
                  3. Choose reminder behavior
                </Text>
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
                    <FormLabel mb={0}>Desktop reminders</FormLabel>
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
                    <FormLabel mb={0}>Repeat until handled</FormLabel>
                    <Switch
                      isChecked={hardToDismiss}
                      onChange={(event) => setHardToDismiss(event.target.checked)}
                    />
                  </FormControl>
                  <FormControl bg={panelBg} borderRadius="2xl" px={4} py={3}>
                    <FormLabel>Repeat every</FormLabel>
                    <Input
                      bg={inputBg}
                      type="number"
                      min={1}
                      value={repeatMinutes}
                      onChange={(event) => setRepeatMinutes(event.target.value)}
                    />
                    <FormHelperText color={mutedText}>minutes</FormHelperText>
                  </FormControl>
                </SimpleGrid>
              </Box>

              <Box bg={modeGradient} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
                <Text fontSize="sm" color={mutedText}>Preview</Text>
                <Heading size="sm" mt={2}>
                  {title || 'Untitled routine'}
                </Heading>
                <Text mt={1} color={mutedText}>
                  {getCategoryLabel(category)}
                </Text>
                <Text mt={3} fontSize="sm" color={mutedText}>
                  {draftSchedules.length === 1
                    ? scheduleKindOptions.find((option) => option.value === draftSchedules[0]?.kind)
                        ?.label ?? 'Cadence not set'
                    : `${draftSchedules.length} schedules combined`}
                </Text>
              </Box>

              <Button
                colorScheme="leaf"
                onClick={() =>
                  addItem().catch((error) => toast({ status: 'error', title: String(error) }))
                }
              >
                Save routine
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
              Existing routines
            </Heading>
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
                      {getCategoryLabel(item.category)}
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
                Admin
              </Badge>
              <Heading size="lg" mt={3}>
                Workspace administration
              </Heading>
              <Text mt={2} color={mutedText} maxW="42rem">
                User management and reviewer assignments for the whole workspace.
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
                Users
              </Heading>
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

  function renderSidebarNav() {
    if (accountMode) {
      return (
        <Stack spacing={4}>
          <Button
            as={RouterLink}
            to="/dashboard"
            justifyContent="flex-start"
            variant="ghost"
            borderRadius="2xl"
            px={4}
            py={3}
          >
            Back to app
          </Button>
          <Text
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="0.16em"
            color={subtleText}
            px={2}
          >
            Account
          </Text>
          <Stack spacing={2}>
            {accountNavItems
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => (
                <NavButton
                  key={item.key}
                  label={item.label}
                  to={item.path}
                  active={currentPage === item.key}
                  accent={accent}
                />
              ))}
          </Stack>
        </Stack>
      );
    }

    return (
      <Stack spacing={4}>
        <Text
          fontSize="xs"
          textTransform="uppercase"
          letterSpacing="0.16em"
          color={subtleText}
          px={2}
        >
          Navigation
        </Text>

        <Stack spacing={2}>
          {appNavItems.map((item) => (
            <NavButton
              key={item.key}
              label={item.label}
              to={item.path}
              active={currentPage === item.key}
              accent={accent}
            />
          ))}
        </Stack>
      </Stack>
    );
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
            <HStack
              spacing={3}
              as={RouterLink}
              to="/dashboard"
              alignSelf="stretch"
              _hover={{ textDecoration: 'none' }}
            >
              <Image src="/leaf.svg" alt="leaf logo" boxSize="36px" flexShrink={0} />
              <HStack spacing={3}>
                <Heading size="sm" color={brandTextColor} letterSpacing="-0.02em">
                  leaf
                </Heading>
                {adminMode && (
                  <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                    Admin
                  </Badge>
                )}
              </HStack>
            </HStack>

            <HStack spacing={3}>
              {loggedIn && user && (
                <Menu placement="bottom-end" autoSelect={false}>
                  <MenuButton
                    as={IconButton}
                    aria-label="Open account menu"
                    variant="ghost"
                    borderRadius="full"
                    bg={accountButtonBg}
                    border="1px solid"
                    borderColor={accountButtonBorder}
                    boxShadow="0 10px 24px rgba(0, 0, 0, 0.06)"
                    _hover={{ bg: accountButtonBg, borderColor: accountButtonBorder }}
                    _active={{ bg: accountButtonBg }}
                    icon={
                      <Avatar
                        size="sm"
                        name={user.name || user.email}
                        src={user.avatarUrl ?? undefined}
                        icon={<UserGlyph />}
                        bg={accountButtonBg}
                        color={accountIconColor}
                      />
                    }
                  />
                  <Portal>
                    <MenuList
                      data-testid="account-menu"
                      borderRadius="2xl"
                      p={2}
                      bg={accountMenuBg}
                      border="1px solid"
                      borderColor={accountMenuBorder}
                      zIndex={2000}
                      boxShadow="0 24px 64px rgba(0, 0, 0, 0.16)"
                      style={
                        {
                          '--account-menu-hover-bg': accountMenuHoverBg,
                        } as CSSProperties
                      }
                    >
                      <Box px={3} py={2}>
                        <Text fontWeight="semibold">{user.name || user.email}</Text>
                        <Text fontSize="sm" color={mutedText}>
                          {user.email}
                        </Text>
                      </Box>
                    <MenuDivider borderColor={accountMenuDivider} />
                    <MenuItem
                      data-testid="account-menu-item-preferences"
                      as={RouterLink}
                      to="/profile"
                      borderRadius="xl"
                      bg="transparent"
                      color="inherit"
                      _hover={{ bg: 'var(--account-menu-hover-bg)' }}
                      _focus={{ bg: 'var(--account-menu-hover-bg)' }}
                      _active={{ bg: 'var(--account-menu-hover-bg)' }}
                    >
                      Manage Preferences
                    </MenuItem>
                    {isAdmin && (
                      <MenuItem
                        as={RouterLink}
                        to="/admin"
                        borderRadius="xl"
                        bg="transparent"
                        color="inherit"
                        _hover={{ bg: 'var(--account-menu-hover-bg)' }}
                        _focus={{ bg: 'var(--account-menu-hover-bg)' }}
                        _active={{ bg: 'var(--account-menu-hover-bg)' }}
                      >
                        Admin
                      </MenuItem>
                    )}
                    <MenuItem
                      icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                      onClick={toggleColorMode}
                      borderRadius="xl"
                      bg="transparent"
                      color="inherit"
                      _hover={{ bg: 'var(--account-menu-hover-bg)' }}
                      _focus={{ bg: 'var(--account-menu-hover-bg)' }}
                      _active={{ bg: 'var(--account-menu-hover-bg)' }}
                    >
                      {colorMode === 'light' ? 'Dark mode' : 'Light mode'}
                    </MenuItem>
                    <MenuDivider borderColor={accountMenuDivider} />
                    <MenuItem
                      onClick={signOut}
                      borderRadius="xl"
                      bg="transparent"
                      color="inherit"
                      _hover={{ bg: 'var(--account-menu-hover-bg)' }}
                      _focus={{ bg: 'var(--account-menu-hover-bg)' }}
                      _active={{ bg: 'var(--account-menu-hover-bg)' }}
                    >
                      Sign out
                    </MenuItem>
                    </MenuList>
                  </Portal>
                </Menu>
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
                  {renderSidebarNav()}
                </Box>
              </GridItem>

              <GridItem>
                <Stack spacing={5}>
                  {renderPageIntro()}
                  {renderPage()}
                </Stack>
              </GridItem>
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
