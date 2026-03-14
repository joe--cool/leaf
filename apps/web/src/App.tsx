import {
  Badge,
  Box,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Image,
  Stack,
  useColorMode,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import 'react-day-picker/dist/style.css';
import './app.css';
import { apiFetch, clearToken, getToken, setRefreshToken, setToken } from './api';
import { categoryOptions, createDraftSchedule } from './appConstants';
import {
  getDefaultTitle,
  projectedChecksPerWeek,
  summarizeActionableState,
  summarizeRecentRevieweeActivity,
  toDayName,
} from './scheduleUtils';
import type {
  ActionableItem,
  AdminUser,
  DraftSchedule,
  Item,
  MemberPortfolio,
  MemberWorkspace,
  OAuthProvider,
  PageKey,
  User,
} from './appTypes';
import { AccountMenu } from './components/AccountMenu';
import { PageIntro } from './components/PageIntro';
import { SessionErrorPanel } from './components/SessionErrorPanel';
import { SidebarNav } from './components/SidebarNav';
import { UserGlyph } from './components/UserGlyph';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { MyItemsPage } from './pages/MyItemsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RoutinesPage } from './pages/RoutinesPage';

function startsWithPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function App() {
  const toast = useToast();
  const location = useLocation();
  const { colorMode, toggleColorMode } = useColorMode();

  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setupDemoMode, setSetupDemoMode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);

  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [memberWorkspaces, setMemberWorkspaces] = useState<MemberWorkspace[]>([]);

  const [title, setTitle] = useState(getDefaultTitle('health'));
  const [category, setCategory] = useState('health');
  const [draftSchedules, setDraftSchedules] = useState<DraftSchedule[]>([createDraftSchedule()]);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [hardToDismiss, setHardToDismiss] = useState(false);
  const [repeatMinutes, setRepeatMinutes] = useState('15');

  const [inviteEmail, setInviteEmail] = useState('');
  const [targetMemberId, setTargetMemberId] = useState('');
  const [adminGuideId, setAdminGuideId] = useState('');
  const [adminMemberId, setAdminMemberId] = useState('');

  const [prefTimezone, setPrefTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [prefDay, setPrefDay] = useState('1');
  const [prefHour, setPrefHour] = useState('8');
  const [profileName, setProfileName] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);

  const loggedIn = Boolean(getToken());
  const isAdmin = useMemo(() => user?.roles.some((entry) => entry.role === 'ADMIN') ?? false, [user?.roles]);

  const projectedWeekChecks = useMemo(() => items.reduce((total, item) => total + projectedChecksPerWeek(item), 0), [items]);
  const relationshipsCount = useMemo(() => (user ? user.members.length + user.guides.length : 0), [user]);
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

  const actionableItems = useMemo<ActionableItem[]>(
    () =>
      items
        .map((item) => ({ item, action: summarizeActionableState(item) }))
        .sort((left, right) => {
          if (left.action.urgency !== right.action.urgency) return left.action.urgency - right.action.urgency;
          return (left.action.dueAt ?? Number.MAX_SAFE_INTEGER) - (right.action.dueAt ?? Number.MAX_SAFE_INTEGER);
        }),
    [items],
  );
  const dueItems = useMemo(() => actionableItems.filter((entry) => entry.action.bucket === 'due'), [actionableItems]);
  const upcomingItems = useMemo(() => actionableItems.filter((entry) => entry.action.bucket === 'upcoming'), [actionableItems]);
  const laterItems = useMemo(() => actionableItems.filter((entry) => entry.action.bucket === 'later'), [actionableItems]);

  const memberPortfolios = useMemo<MemberPortfolio[]>(
    () =>
      memberWorkspaces
        .map((workspace) => {
          const actionable = workspace.items
            .map((item) => ({ item, action: summarizeActionableState(item) }))
            .sort((left, right) => {
              if (left.action.urgency !== right.action.urgency) return left.action.urgency - right.action.urgency;
              return (left.action.dueAt ?? Number.MAX_SAFE_INTEGER) - (right.action.dueAt ?? Number.MAX_SAFE_INTEGER);
            });
          const overdue = actionable.filter((entry) => entry.action.status === 'Overdue');
          const dueToday = actionable.filter((entry) => entry.action.bucket === 'due' && entry.action.status !== 'Overdue');
          const upcoming = actionable.filter((entry) => entry.action.bucket === 'upcoming');
          const recentActivity = summarizeRecentRevieweeActivity(workspace.items);
          const nextUrgent = overdue[0] ?? dueToday[0] ?? upcoming[0] ?? actionable[0] ?? null;
          const rank =
            overdue.length * 1000 +
            dueToday.length * 100 +
            upcoming.length * 10 +
            Math.max(recentActivity.length, 1);

          return {
            ...workspace,
            actionable,
            overdue,
            dueToday,
            upcoming,
            missedCount: 0,
            recentActivity,
            nextUrgent,
            rank,
          };
        })
        .sort((left, right) => right.rank - left.rank || left.member.name.localeCompare(right.member.name)),
    [memberWorkspaces],
  );

  const canGuideMembers = (user?.members.length ?? 0) > 0;
  const currentPage: PageKey = useMemo(() => {
    if (startsWithPath(location.pathname, '/notifications')) return 'notifications';
    if (startsWithPath(location.pathname, '/profile')) return 'profile';
    if (startsWithPath(location.pathname, '/my-items')) return 'my-items';
    if (startsWithPath(location.pathname, '/members')) return 'members';
    if (startsWithPath(location.pathname, '/routines')) return 'routines';
    if (startsWithPath(location.pathname, '/items')) return 'routines';
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
  const statGlow = useColorModeValue('0 24px 80px rgba(107, 85, 69, 0.12)', '0 24px 80px rgba(0, 0, 0, 0.34)');
  const inputBg = useColorModeValue('rgba(255, 251, 246, 0.94)', 'rgba(16, 21, 21, 0.92)');
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
  const accountMenuHoverBg = useColorModeValue('rgba(122, 97, 77, 0.10)', 'rgba(255, 255, 255, 0.08)');
  const accountMenuDivider = useColorModeValue(
    accountMode ? 'rgba(192, 88, 40, 0.16)' : 'rgba(161, 129, 107, 0.16)',
    accountMode ? 'rgba(242, 215, 199, 0.10)' : 'rgba(222, 212, 194, 0.10)',
  );
  const accent = accountMode ? 'clay' : 'leaf';
  const brandTextColor = accountMode ? 'clay.700' : 'leaf.700';
  const heroGradient = useColorModeValue(
    'linear(to-br, rgba(229, 238, 228, 0.96), rgba(247, 235, 222, 0.92))',
    'linear(to-br, rgba(34, 53, 40, 0.96), rgba(61, 43, 36, 0.92))',
  );
  const modeGradient = useColorModeValue(
    accountMode
      ? 'linear(to-br, rgba(252, 232, 223, 0.96), rgba(249, 244, 236, 0.96))'
      : 'linear(to-br, rgba(231, 241, 233, 0.96), rgba(250, 240, 227, 0.96))',
    accountMode
      ? 'linear(to-br, rgba(73, 41, 30, 0.92), rgba(34, 29, 29, 0.92))'
      : 'linear(to-br, rgba(31, 50, 36, 0.92), rgba(38, 33, 26, 0.92))',
  );
  const sectionBg = useColorModeValue('rgba(249, 244, 236, 0.88)', 'rgba(18, 24, 24, 0.88)');
  const appBg = useColorModeValue('linear(to-br, #f8f2ea, #f4f7ef)', 'linear(to-br, #121616, #191511)');
  const overlayGradient = useColorModeValue(
    'radial-gradient(circle at top left, rgba(255,255,255,0.65), transparent 45%)',
    'radial-gradient(circle at top left, rgba(120, 139, 122, 0.12), transparent 42%)',
  );

  const pageEyebrow =
    currentPage === 'dashboard'
      ? 'Dashboard'
      : currentPage === 'notifications'
        ? 'Notifications'
      : currentPage === 'my-items'
        ? 'My Items'
      : currentPage === 'members'
          ? 'Guide'
          : currentPage === 'routines'
            ? 'Routines'
            : currentPage === 'profile'
              ? 'Account'
              : 'Admin';
  const pageTitle =
    currentPage === 'dashboard'
      ? 'Overview'
      : currentPage === 'notifications'
        ? 'Notifications'
      : currentPage === 'my-items'
        ? 'My Items'
      : currentPage === 'members'
          ? 'Members'
        : currentPage === 'routines'
          ? 'Routines'
          : currentPage === 'profile'
            ? 'Profile & Relationships'
            : 'Admin';
  const pageSummary =
    currentPage === 'dashboard'
      ? 'See what needs attention now across your items, members, and next check-in.'
      : currentPage === 'notifications'
        ? 'Review your in-app feed, understand each delivery channel, and set digest timing in one place.'
      : currentPage === 'my-items'
        ? 'Focus on what needs attention now, what is coming up next, and what can wait.'
        : currentPage === 'members'
          ? 'See which members need support first, what is coming up next, and where your visibility is limited.'
          : currentPage === 'routines'
          ? 'Create, schedule, and refine routines in one management space.'
          : currentPage === 'profile'
              ? 'Update identity details and make relationship permissions visible.'
              : 'User roles and relationship assignments.';

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

    if (me.members.length > 0) {
      setMemberWorkspaces(await apiFetch<MemberWorkspace[]>('/members'));
    } else {
      setMemberWorkspaces([]);
    }

    if (me.roles.some((entry) => entry.role === 'ADMIN')) {
      const users = await apiFetch<AdminUser[]>('/admin/users');
      setAdminUsers(users);
      if (!targetMemberId && users.length > 0) setTargetMemberId(users[0]!.id);
      if (!adminGuideId && users.length > 0) setAdminGuideId(users[0]!.id);
      if (!adminMemberId && users.length > 0) setAdminMemberId(users[0]!.id);
    } else {
      setAdminUsers([]);
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
    return { kind: 'MULTI' as const, schedules, timezone: prefTimezone || 'UTC' };
  }

  async function runSetup() {
    const result = await apiFetch<{ accessToken: string; refreshToken: string }>('/setup/first-admin', {
      method: 'POST',
      body: JSON.stringify({
        email: setupEmail,
        name: setupEmail,
        password: setupPassword,
        setupToken: setupToken || undefined,
        demoMode: setupDemoMode,
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
    setTitle(getDefaultTitle(category));
    setDraftSchedules([createDraftSchedule()]);
    await refreshMe();
  }

  function onCategoryChange(nextCategory: string) {
    setCategory(nextCategory);
    setTitle((currentTitle) => {
      const trimmedTitle = currentTitle.trim();
      const currentDefault = getDefaultTitle(category);
      if (trimmedTitle === '' || trimmedTitle === currentDefault) return getDefaultTitle(nextCategory);
      return currentTitle;
    });
  }

  async function inviteReviewer() {
    await apiFetch('/guides/invite', {
      method: 'POST',
      body: JSON.stringify({ email: inviteEmail, ...(isAdmin ? { targetMemberId } : {}) }),
    });
    toast({ status: 'success', title: 'Invite sent' });
    setInviteEmail('');
  }

  async function adminAssignReviewer() {
    await apiFetch('/admin/guides', {
      method: 'POST',
      body: JSON.stringify({ guideId: adminGuideId, memberId: adminMemberId }),
    });
    toast({ status: 'success', title: 'Reviewer relationship updated' });
    await refreshMe();
  }

  async function updateProfile() {
    await apiFetch('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({
        name: profileName,
        avatarUrl: profileAvatarUrl,
      }),
    });
    toast({ status: 'success', title: 'Profile updated' });
    await refreshMe();
  }

  async function updateNotificationPreferences() {
    await apiFetch('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({
        timezone: prefTimezone,
        weeklyDigestDay: Number(prefDay),
        weeklyDigestHour: Number(prefHour),
      }),
    });
    toast({ status: 'success', title: 'Notifications updated' });
    await refreshMe();
  }

  function signOut() {
    clearToken();
    setUser(null);
    setItems([]);
    setAdminUsers([]);
    setMemberWorkspaces([]);
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
    setDraftSchedules((current) => current.map((entry, entryIndex) => (entryIndex === index ? mutator(entry) : entry)));
  }

  function addSchedule() {
    setDraftSchedules((current) => [...current, createDraftSchedule()]);
  }

  function removeSchedule(index: number) {
    setDraftSchedules((current) => (current.length > 1 ? current.filter((_, entryIndex) => entryIndex !== index) : current));
  }

  function updateDailyTime(scheduleIndex: number, timeIndex: number, value: string) {
    updateDraftSchedule(scheduleIndex, (schedule) => ({
      ...schedule,
      dailyTimes: schedule.dailyTimes.map((entry, entryIndex) => (entryIndex === timeIndex ? value : entry)),
    }));
  }

  function addDailyTime(scheduleIndex: number) {
    updateDraftSchedule(scheduleIndex, (schedule) => ({ ...schedule, dailyTimes: [...schedule.dailyTimes, '12:00'] }));
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
    updateDraftSchedule(scheduleIndex, (schedule) => ({ ...schedule, customDates: [...schedule.customDates, ''] }));
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

  function renderPage() {
    if (!user) return null;

    if (currentPage === 'profile') {
      return (
        <ProfilePage
          user={user}
          profileName={profileName}
          setProfileName={setProfileName}
          profileAvatarUrl={profileAvatarUrl}
          setProfileAvatarUrl={setProfileAvatarUrl}
          inputBg={inputBg}
          panelBgStrong={panelBgStrong}
          panelBorder={panelBorder}
          statGlow={statGlow}
          mutedText={mutedText}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          isAdmin={isAdmin}
          adminUsers={adminUsers}
          targetMemberId={targetMemberId}
          setTargetMemberId={setTargetMemberId}
          onUpdateProfile={updateProfile}
          onInviteReviewer={inviteReviewer}
          onAvatarSelected={onAvatarSelected}
        />
      );
    }
    if (currentPage === 'notifications') {
      return (
        <NotificationsPage
          user={user}
          items={items}
          actionableItems={actionableItems}
          memberPortfolios={memberPortfolios}
          prefTimezone={prefTimezone}
          setPrefTimezone={setPrefTimezone}
          prefDay={prefDay}
          setPrefDay={setPrefDay}
          prefHour={prefHour}
          setPrefHour={setPrefHour}
          digestSummary={digestSummary}
          panelBgStrong={panelBgStrong}
          panelBorder={panelBorder}
          statGlow={statGlow}
          mutedText={mutedText}
          subtleText={subtleText}
          panelBg={panelBg}
          inputBg={inputBg}
          onSaveNotificationPreferences={updateNotificationPreferences}
        />
      );
    }
    if (currentPage === 'my-items') {
      return (
        <MyItemsPage
          items={items}
          dueItems={dueItems}
          actionableItems={actionableItems}
          upcomingItems={upcomingItems}
          laterItems={laterItems}
          modeGradient={modeGradient}
          panelBgStrong={panelBgStrong}
          panelBorder={panelBorder}
          statGlow={statGlow}
          subtleText={subtleText}
          mutedText={mutedText}
          panelBg={panelBg}
        />
      );
    }
    if (currentPage === 'members') {
      return (
        <MembersPage
          canReviewOthers={canGuideMembers}
          memberPortfolios={memberPortfolios}
          modeGradient={modeGradient}
          panelBgStrong={panelBgStrong}
          panelBorder={panelBorder}
          statGlow={statGlow}
          subtleText={subtleText}
          mutedText={mutedText}
          panelBg={panelBg}
        />
      );
    }
    if (currentPage === 'routines') {
      return (
        <RoutinesPage
          panelBgStrong={panelBgStrong}
          panelBorder={panelBorder}
          statGlow={statGlow}
          sectionBg={sectionBg}
          inputBg={inputBg}
          panelBg={panelBg}
          mutedText={mutedText}
          modeGradient={modeGradient}
          title={title}
          setTitle={setTitle}
          category={category}
          onCategoryChange={onCategoryChange}
          draftSchedules={draftSchedules}
          updateDraftSchedule={updateDraftSchedule}
          addSchedule={addSchedule}
          removeSchedule={removeSchedule}
          updateDailyTime={updateDailyTime}
          addDailyTime={addDailyTime}
          removeDailyTime={removeDailyTime}
          updateCustomDate={updateCustomDate}
          addCustomDate={addCustomDate}
          removeCustomDate={removeCustomDate}
          notificationEnabled={notificationEnabled}
          setNotificationEnabled={setNotificationEnabled}
          hardToDismiss={hardToDismiss}
          setHardToDismiss={setHardToDismiss}
          repeatMinutes={repeatMinutes}
          setRepeatMinutes={setRepeatMinutes}
          onAddItem={addItem}
          items={items}
        />
      );
    }
    if (currentPage === 'admin') {
      return (
        <AdminPage
          isAdmin={isAdmin}
          adminUsers={adminUsers}
          adminReviewerId={adminGuideId}
          adminRevieweeId={adminMemberId}
          setAdminReviewerId={setAdminGuideId}
          setAdminRevieweeId={setAdminMemberId}
          onSaveMapping={adminAssignReviewer}
          modeGradient={modeGradient}
          panelBgStrong={panelBgStrong}
          panelBorder={panelBorder}
          statGlow={statGlow}
          mutedText={mutedText}
          panelBg={panelBg}
        />
      );
    }

    return (
      <DashboardPage
        items={items}
        actionableItems={actionableItems}
        dueItems={dueItems}
        upcomingItems={upcomingItems}
        laterItems={laterItems}
        projectedWeekChecks={projectedWeekChecks}
        relationshipsCount={relationshipsCount}
        digestSummary={digestSummary}
        categoryBreakdown={categoryBreakdown}
        user={user}
        canReviewOthers={canGuideMembers}
        memberPortfolios={memberPortfolios}
        panelBgStrong={panelBgStrong}
        panelBorder={panelBorder}
        statGlow={statGlow}
        subtleText={subtleText}
        mutedText={mutedText}
        panelBg={panelBg}
        modeGradient={modeGradient}
      />
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
            <HStack spacing={3} as={RouterLink} to="/dashboard" alignSelf="stretch" _hover={{ textDecoration: 'none' }}>
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
                <AccountMenu
                  userName={user.name}
                  userEmail={user.email}
                  avatarUrl={user.avatarUrl}
                  accountButtonBg={accountButtonBg}
                  accountButtonBorder={accountButtonBorder}
                  accountIconColor={accountIconColor}
                  accountMenuBg={accountMenuBg}
                  accountMenuBorder={accountMenuBorder}
                  accountMenuHoverBg={accountMenuHoverBg}
                  accountMenuDivider={accountMenuDivider}
                  isAdmin={isAdmin}
                  colorMode={colorMode}
                  onToggleColorMode={toggleColorMode}
                  onSignOut={signOut}
                  userGlyph={<UserGlyph />}
                />
              )}
            </HStack>
          </Flex>

          {!loggedIn ? (
            <AuthPage
              needsSetup={needsSetup}
              heroGradient={heroGradient}
              panelBorder={panelBorder}
              statGlow={statGlow}
              subtleText={subtleText}
              mutedText={mutedText}
              panelBgStrong={panelBgStrong}
              inputBg={inputBg}
              setupEmail={setupEmail}
              setSetupEmail={setSetupEmail}
              setupPassword={setupPassword}
              setSetupPassword={setSetupPassword}
              setupToken={setupToken}
              setSetupToken={setSetupToken}
              setupDemoMode={setupDemoMode}
              setSetupDemoMode={setSetupDemoMode}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              oauthProviders={oauthProviders}
              onRunSetup={runSetup}
              onLogin={login}
              onLoginWithProvider={loginWithProvider}
            />
          ) : !user ? (
            <SessionErrorPanel
              panelBgStrong={panelBgStrong}
              statGlow={statGlow}
              panelBorder={panelBorder}
              mutedText={mutedText}
              sessionLoadError={sessionLoadError}
              onRetry={() =>
                refreshMe()
                  .then(() => setSessionLoadError(null))
                  .catch((error) => setSessionLoadError(String(error)))
              }
              onSignOut={signOut}
            />
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
                  <SidebarNav
                    accountMode={accountMode}
                    subtleText={subtleText}
                    isAdmin={isAdmin}
                    currentPage={currentPage}
                    accent={accent}
                    canReviewOthers={canGuideMembers}
                  />
                </Box>
              </GridItem>

              <GridItem>
                <Stack spacing={5}>
                  <PageIntro
                    eyebrow={pageEyebrow}
                    title={pageTitle}
                    summary={pageSummary}
                    subtleText={subtleText}
                    mutedText={mutedText}
                    currentPage={currentPage}
                    panelBgStrong={panelBgStrong}
                    panelBorder={panelBorder}
                    digestSummary={digestSummary}
                  />
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
