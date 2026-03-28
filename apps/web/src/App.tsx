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
  Text,
  useColorMode,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, matchPath, useLocation, useNavigate } from 'react-router-dom';
import 'react-day-picker/dist/style.css';
import './app.css';
import { defaultReflectionWritingPrompt } from '@leaf/shared';
import { apiFetch, clearToken, getToken, setRefreshToken, setToken } from './api';
import { categoryOptions, createDraftSchedule } from './appConstants';
import { resolveTemplateDraft } from './itemTemplates';
import {
  buildScheduleFromDrafts,
  draftSchedulesFromItem,
  getDefaultTitle,
  projectedChecksPerWeek,
  summarizeActionableState,
  summarizeRecentRevieweeActivity,
  toDayName,
} from './scheduleUtils';
import type {
  ActionableItem,
  AdminUser,
  AuthNextStep,
  AuditLogEntry,
  DraftSchedule,
  ItemCreationMode,
  InvitePreview,
  Item,
  MemberPortfolio,
  MemberWorkspace,
  OAuthProvider,
  PageKey,
  RetrospectiveDraftKind,
  RetrospectiveEntry,
  RetrospectiveSubjectOption,
  User,
} from './appTypes';
import { AccountMenu } from './components/AccountMenu';
import { NotificationMailbox } from './components/NotificationMailbox';
import { PageIntro } from './components/PageIntro';
import { SessionErrorPanel } from './components/SessionErrorPanel';
import { SidebarNav } from './components/SidebarNav';
import { UserGlyph } from './components/UserGlyph';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { InviteAcceptancePage } from './pages/InviteAcceptancePage';
import { MembersPage } from './pages/MembersPage';
import { MyItemsPage } from './pages/MyItemsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RetrospectiveDetailPage } from './pages/RetrospectiveDetailPage';
import { RetrospectiveCreatePage } from './pages/RetrospectiveCreatePage';
import { RetrospectivesPage } from './pages/RetrospectivesPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { WelcomePage } from './pages/WelcomePage';
import { cadenceWindowForDate } from './reflectionUtils';

function startsWithPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function onboardingStorageKey(userId: string): string {
  return `leaf_onboarding_seen_${userId}`;
}

function buildNextStep(user: User, items: Item[]): AuthNextStep {
  if (user.members.length > 0) {
    return {
      title: 'Review your member workspace',
      description: 'Start in the guide workspace so you can see who needs support first and confirm the relationship context.',
      path: '/members',
      actionLabel: 'Open Members',
    };
  }
  if (items.length === 0) {
    return {
      title: 'Create your first tracked item',
      description: 'Begin with one useful item so the member workspace becomes actionable immediately.',
      path: '/routines',
      actionLabel: 'Create First Item',
    };
  }
  if (user.guides.length === 0) {
    return {
      title: 'Invite a guide',
      description: 'Set up a transparent relationship so someone can support or review your follow-through with explicit permissions.',
      path: '/profile',
      actionLabel: 'Invite a Guide',
    };
  }
  return {
    title: 'Start from your action workspace',
    description: 'You already have a basic setup, so move into your queue and keep momentum.',
    path: '/my-items',
    actionLabel: 'Open My Items',
  };
}

export function App() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { colorMode, toggleColorMode } = useColorMode();

  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setupDemoMode, setSetupDemoMode] = useState(false);
  const [selectedRelationshipTemplateId, setSelectedRelationshipTemplateId] = useState('active-guide');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [invitePreviewError, setInvitePreviewError] = useState<string | null>(null);
  const [didSeedDemoWorkspace, setDidSeedDemoWorkspace] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [memberWorkspaces, setMemberWorkspaces] = useState<MemberWorkspace[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [retrospectiveEntries, setRetrospectiveEntries] = useState<RetrospectiveEntry[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState('medication');
  const [creationMode, setCreationMode] = useState<ItemCreationMode>('recurring');
  const initialTemplate = resolveTemplateDraft('medication', 'recurring');
  const [title, setTitle] = useState(initialTemplate.title);
  const [category, setCategory] = useState(initialTemplate.category);
  const [draftSchedules, setDraftSchedules] = useState<DraftSchedule[]>(initialTemplate.draftSchedules);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [hardToDismiss, setHardToDismiss] = useState(false);
  const [repeatMinutes, setRepeatMinutes] = useState('15');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [targetMemberId, setTargetMemberId] = useState('');
  const [adminGuideId, setAdminGuideId] = useState('');
  const [adminMemberId, setAdminMemberId] = useState('');

  const [prefTimezone, setPrefTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [prefDay, setPrefDay] = useState('1');
  const [prefHour, setPrefHour] = useState('8');
  const [reflectionCadence, setReflectionCadence] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [reflectionWeekday, setReflectionWeekday] = useState('0');
  const [reflectionMonthDay, setReflectionMonthDay] = useState('1');
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
  const inviteMatch = matchPath('/join/:token', location.pathname);
  const inviteToken = inviteMatch?.params.token ?? null;
  const isCreatingRetrospective = location.pathname === '/retrospectives/new';
  const retrospectiveMatch = isCreatingRetrospective ? null : matchPath('/retrospectives/:id', location.pathname);
  const retrospectiveId = retrospectiveMatch?.params.id ?? null;
  const welcomeMode = startsWithPath(location.pathname, '/welcome');
  const selectedRetrospective = useMemo(
    () => retrospectiveEntries.find((entry) => entry.id === retrospectiveId) ?? null,
    [retrospectiveEntries, retrospectiveId],
  );
  const currentPage: PageKey = useMemo(() => {
    if (startsWithPath(location.pathname, '/profile')) return 'profile';
    if (startsWithPath(location.pathname, '/retrospectives')) return 'retrospectives';
    if (startsWithPath(location.pathname, '/audit-log')) return 'audit-log';
    if (startsWithPath(location.pathname, '/welcome')) return 'dashboard';
    if (startsWithPath(location.pathname, '/my-items')) return 'my-items';
    if (startsWithPath(location.pathname, '/members')) return 'members';
    if (startsWithPath(location.pathname, '/routines')) return 'routines';
    if (startsWithPath(location.pathname, '/items')) return 'routines';
    if (startsWithPath(location.pathname, '/admin')) return 'admin';
    return 'dashboard';
  }, [location.pathname]);
  const hidePageIntro = currentPage === 'retrospectives' && isCreatingRetrospective;

  const accountMode = currentPage === 'profile' || currentPage === 'audit-log' || currentPage === 'admin';
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
    welcomeMode
      ? 'Onboarding'
      : currentPage === 'dashboard'
      ? 'Dashboard'
      : currentPage === 'my-items'
        ? 'My Items'
      : currentPage === 'members'
          ? 'Guide'
          : currentPage === 'routines'
            ? 'Routines'
            : currentPage === 'profile'
              ? 'Account'
              : currentPage === 'retrospectives'
              ? 'History'
                : currentPage === 'audit-log'
                  ? 'Transparency'
              : 'Admin';
  const pageTitle =
    welcomeMode
      ? 'Welcome'
      : currentPage === 'dashboard'
      ? 'Overview'
      : currentPage === 'my-items'
        ? 'My Items'
        : currentPage === 'members'
          ? 'Members'
        : currentPage === 'routines'
          ? 'Routines'
          : currentPage === 'profile'
            ? 'Profile & Relationships'
            : currentPage === 'retrospectives'
              ? retrospectiveId && selectedRetrospective
                ? selectedRetrospective.title
                : 'Looking Back'
              : currentPage === 'audit-log'
                ? 'Audit Log'
            : 'Admin';
  const pageSummary =
    welcomeMode
      ? 'Confirm how Leaf works, then jump straight into the next job that matches your role.'
      : currentPage === 'dashboard'
      ? 'See what needs attention now across your items, members, and next check-in.'
      : currentPage === 'my-items'
        ? 'Focus on what needs attention now, what is coming up next, and what can wait.'
        : currentPage === 'members'
          ? 'See which members need support first, what is coming up next, and where your visibility is limited.'
          : currentPage === 'routines'
          ? 'Create, schedule, and refine routines in one management space.'
          : currentPage === 'profile'
              ? 'Update identity details and make relationship permissions visible.'
              : currentPage === 'retrospectives'
                ? retrospectiveId
                  ? 'Review one reflection, update its summary, and keep reflective notes attached to that record.'
                  : 'Search and browse old reflections, then open the one you want to review.'
                : currentPage === 'audit-log'
                  ? 'Inspect attributed account, relationship, and routine changes without leaving the product.'
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
    setReflectionCadence(me.reflectionCadence);
    setReflectionWeekday(String(me.reflectionWeekday));
    setReflectionMonthDay(String(me.reflectionMonthDay));

    const loadedItems = await apiFetch<Item[]>('/items');
    setItems(loadedItems);

    if (me.members.length > 0) {
      setMemberWorkspaces(await apiFetch<MemberWorkspace[]>('/members'));
    } else {
      setMemberWorkspaces([]);
    }

    const loadedAuditEntries = await apiFetch<AuditLogEntry[]>('/history/audit');
    setAuditEntries(loadedAuditEntries);

    const loadedRetrospectives = await apiFetch<RetrospectiveEntry[]>('/retrospectives');
    setRetrospectiveEntries(loadedRetrospectives);

    if (me.roles.some((entry) => entry.role === 'ADMIN')) {
      const users = await apiFetch<AdminUser[]>('/admin/users');
      setAdminUsers(users);
      if (!targetMemberId && users.length > 0) setTargetMemberId(users[0]!.id);
      if (!adminGuideId && users.length > 0) setAdminGuideId(users[0]!.id);
      if (!adminMemberId && users.length > 0) setAdminMemberId(users[0]!.id);
    } else {
      setAdminUsers([]);
    }

    return {
      user: me,
      items: loadedItems,
      auditEntries: loadedAuditEntries,
      retrospectives: loadedRetrospectives,
    };
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
    if (!needsSetup || setupToken.trim().length > 0) return;
    const searchParams = new URLSearchParams(location.search);
    const setupTokenFromUrl = searchParams.get('setupToken')?.trim();
    if (setupTokenFromUrl) {
      setSetupToken(setupTokenFromUrl);
    }
  }, [location.search, needsSetup, setupToken]);

  useEffect(() => {
    if (!loggedIn) return;
    refreshMe()
      .then(() => setSessionLoadError(null))
      .catch((error) => setSessionLoadError(String(error)));
  }, [loggedIn]);

  useEffect(() => {
    if (!inviteToken) {
      setInvitePreview(null);
      setInvitePreviewError(null);
      return;
    }

    apiFetch<InvitePreview>(`/invites/${inviteToken}`)
      .then((preview) => {
        setInvitePreview(preview);
        setInvitePreviewError(null);
        setEmail((current) => current || preview.inviteeEmail);
        setRegisterEmail((current) => current || preview.inviteeEmail);
      })
      .catch((error) => {
        setInvitePreview(null);
        setInvitePreviewError(String(error));
      });
  }, [inviteToken]);

  function resetItemEditor(templateId = selectedTemplateId, mode = creationMode) {
    const nextDraft = resolveTemplateDraft(templateId as Parameters<typeof resolveTemplateDraft>[0], mode);
    setSelectedTemplateId(templateId);
    setCreationMode(mode);
    setTitle(nextDraft.title);
    setCategory(nextDraft.category);
    setDraftSchedules(nextDraft.draftSchedules);
    setNotificationEnabled(true);
    setHardToDismiss(false);
    setRepeatMinutes('15');
    setEditingItemId(null);
  }

  function buildSchedule() {
    return buildScheduleFromDrafts(draftSchedules, prefTimezone || 'UTC');
  }

  function markOnboardingSeen(currentUser: User | null) {
    if (!currentUser) return;
    localStorage.setItem(onboardingStorageKey(currentUser.id), 'true');
  }

  async function acceptInvite(token: string) {
    await apiFetch('/guides/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async function finishAuthentication(options?: { inviteToken?: string; demoMode?: boolean }) {
    if (options?.inviteToken) {
      await acceptInvite(options.inviteToken);
    }

    const session = await refreshMe();
    setDidSeedDemoWorkspace(Boolean(options?.demoMode));

    if (!localStorage.getItem(onboardingStorageKey(session.user.id))) {
      navigate('/welcome');
      return;
    }

    navigate(buildNextStep(session.user, session.items).path);
  }

  async function runSetup() {
    const result = await apiFetch<{ accessToken: string; refreshToken: string }>('/setup/first-admin', {
      method: 'POST',
      body: JSON.stringify({
        email: setupEmail,
        name: setupName,
        password: setupPassword,
        setupToken: setupToken || undefined,
        demoMode: setupDemoMode,
      }),
    });
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    await finishAuthentication({ demoMode: setupDemoMode });
    await refreshSetup();
  }

  async function login() {
    const result = await apiFetch<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    await finishAuthentication({ inviteToken: inviteToken ?? undefined });
  }

  async function registerFromInvite() {
    if (!inviteToken) throw new Error('Invite token is missing');
    const result = await apiFetch<{ accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        token: inviteToken,
      }),
    });
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    await finishAuthentication({ inviteToken });
  }

  async function loginWithProvider(provider: OAuthProvider) {
    const returnTo = `${window.location.origin}/oauth/callback`;
    const response = await apiFetch<{ url: string }>(
      `/auth/oauth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`,
    );
    window.location.href = response.url;
  }

  async function saveItem() {
    await apiFetch(editingItemId ? `/items/${editingItemId}` : '/items', {
      method: editingItemId ? 'PUT' : 'POST',
      body: JSON.stringify({
        title,
        category,
        schedule: buildSchedule(),
        notificationEnabled,
        notificationHardToDismiss: hardToDismiss,
        notificationRepeatMinutes: Number(repeatMinutes),
      }),
    });
    toast({ status: 'success', title: editingItemId ? 'Item updated' : 'Item added' });
    resetItemEditor();
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

  function onTemplateChange(nextTemplateId: string) {
    const nextDraft = resolveTemplateDraft(nextTemplateId as Parameters<typeof resolveTemplateDraft>[0], creationMode);
    setSelectedTemplateId(nextTemplateId);
    setEditingItemId(null);
    setCategory(nextDraft.category);
    setTitle(nextDraft.title);
    setDraftSchedules(nextDraft.draftSchedules);
    setNotificationEnabled(true);
    setHardToDismiss(false);
    setRepeatMinutes('15');
  }

  function onCreationModeChange(nextMode: ItemCreationMode) {
    setCreationMode(nextMode);
    if (editingItemId) {
      setEditingItemId(null);
    }
    const nextDraft = resolveTemplateDraft(selectedTemplateId as Parameters<typeof resolveTemplateDraft>[0], nextMode);
    setCategory(nextDraft.category);
    setTitle(nextDraft.title);
    setDraftSchedules(nextDraft.draftSchedules);
  }

  function editItem(item: Item) {
    setEditingItemId(item.id);
    setSelectedTemplateId('scratch');
    setCreationMode(item.scheduleKind === 'ONE_TIME' ? 'one-time' : 'recurring');
    setTitle(item.title);
    setCategory(item.category);
    setDraftSchedules(draftSchedulesFromItem(item));
    setNotificationEnabled(item.notificationEnabled ?? true);
    setHardToDismiss(item.notificationHardToDismiss ?? false);
    setRepeatMinutes(String(item.notificationRepeatMinutes ?? 15));
    navigate('/routines');
  }

  async function inviteReviewer() {
    await apiFetch('/guides/invite', {
      method: 'POST',
      body: JSON.stringify({
        email: inviteEmail,
        relationshipTemplateId: selectedRelationshipTemplateId,
        ...(isAdmin ? { targetMemberId } : {}),
      }),
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
    const updatedUser = await apiFetch<User>('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({
        name: profileName,
        avatarUrl: profileAvatarUrl,
      }),
    });
    setUser((current) => (current ? { ...current, ...updatedUser } : current));
    toast({ status: 'success', title: 'Profile updated' });
  }

  async function updateNotificationPreferences() {
    const updatedUser = await apiFetch<User>('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({
        timezone: prefTimezone,
        weeklyDigestDay: Number(prefDay),
        weeklyDigestHour: Number(prefHour),
        reflectionCadence,
        reflectionWeekday: Number(reflectionWeekday),
        reflectionMonthDay: Number(reflectionMonthDay),
      }),
    });
    setUser((current) => (current ? { ...current, ...updatedUser } : current));
    toast({ status: 'success', title: 'Notification preferences updated' });
  }

  async function updateReflectionPrompt(targetUserId: string, reflectionPrompt: string | null) {
    const updatedUser = await apiFetch<{ id: string; reflectionPrompt?: string | null; name?: string; avatarUrl?: string | null }>(
      '/me/preferences',
      {
      method: 'PATCH',
      body: JSON.stringify({
        targetMemberId: targetUserId === user?.id ? undefined : targetUserId,
        reflectionPrompt,
      }),
      },
    );
    const resolvedPrompt = updatedUser.reflectionPrompt?.trim() || defaultReflectionWritingPrompt;
    setUser((current) =>
      current && current.id === updatedUser.id
        ? {
            ...current,
            reflectionPrompt: updatedUser.reflectionPrompt ?? null,
          }
        : current,
    );
    setMemberWorkspaces((current) =>
      current.map((workspace) =>
        workspace.member.id === updatedUser.id
          ? {
              ...workspace,
              member: {
                ...workspace.member,
                reflectionPrompt: updatedUser.reflectionPrompt ?? null,
              },
            }
          : workspace,
      ),
    );
    setRetrospectiveEntries((current) =>
      current.map((entry) =>
        entry.subjectUserId === updatedUser.id
          ? {
              ...entry,
              writingPrompt: resolvedPrompt,
            }
          : entry,
      ),
    );
    toast({ status: 'success', title: 'Writing prompt updated' });
  }

  async function createRetrospective(payload: {
    subjectUserId?: string;
    kind: 'manual' | 'scheduled';
    periodStart: string;
    periodEnd: string;
    promptPreset: 'weekly-review' | 'support-check-in' | 'reset-and-obstacles';
    title?: string;
    summary?: string;
  }) {
    const created = await apiFetch<RetrospectiveEntry>('/retrospectives', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setRetrospectiveEntries((current) => [created, ...current.filter((entry) => entry.id !== created.id)]);
    toast({ status: 'success', title: 'Retrospective created' });
    return created;
  }

  async function addRetrospectiveContribution(id: string, body: string) {
    const updated = await apiFetch<RetrospectiveEntry>(`/retrospectives/${id}/contributions`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    setRetrospectiveEntries((current) => current.map((entry) => (entry.id === id ? updated : entry)));
    toast({ status: 'success', title: 'Retrospective updated' });
  }

  async function updateRetrospectiveSummary(id: string, summary: string) {
    const updated = await apiFetch<RetrospectiveEntry>(`/retrospectives/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ summary }),
    });
    setRetrospectiveEntries((current) => current.map((entry) => (entry.id === id ? updated : entry)));
    toast({ status: 'success', title: 'Reflection summary updated' });
  }

  function signOut() {
    clearToken();
    setUser(null);
    setItems([]);
    setAdminUsers([]);
    setMemberWorkspaces([]);
    setAuditEntries([]);
    setRetrospectiveEntries([]);
    setProfileName('');
    setProfileAvatarUrl(null);
    setReflectionCadence('weekly');
    setReflectionWeekday('0');
    setReflectionMonthDay('1');
    setSessionLoadError(null);
    setDidSeedDemoWorkspace(false);
    navigate('/dashboard');
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

    if (startsWithPath(location.pathname, '/welcome')) {
      return (
        <WelcomePage
          user={user}
          nextStep={buildNextStep(user, items)}
          panelBgStrong={panelBgStrong}
          panelBorder={panelBorder}
          statGlow={statGlow}
          mutedText={mutedText}
          modeGradient={modeGradient}
          isDemoWorkspace={didSeedDemoWorkspace}
          onFinish={() => markOnboardingSeen(user)}
        />
      );
    }

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
          prefTimezone={prefTimezone}
          setPrefTimezone={setPrefTimezone}
          prefDay={prefDay}
          setPrefDay={setPrefDay}
          prefHour={prefHour}
          setPrefHour={setPrefHour}
          reflectionCadence={reflectionCadence}
          setReflectionCadence={setReflectionCadence}
          reflectionWeekday={reflectionWeekday}
          setReflectionWeekday={setReflectionWeekday}
          reflectionMonthDay={reflectionMonthDay}
          setReflectionMonthDay={setReflectionMonthDay}
          mutedText={mutedText}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          selectedTemplateId={selectedRelationshipTemplateId}
          setSelectedTemplateId={setSelectedRelationshipTemplateId}
          isAdmin={isAdmin}
          adminUsers={adminUsers}
          targetMemberId={targetMemberId}
          setTargetMemberId={setTargetMemberId}
          onUpdateProfile={updateProfile}
          onUpdateNotificationPreferences={updateNotificationPreferences}
          onInviteReviewer={inviteReviewer}
          onAvatarSelected={onAvatarSelected}
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
          reflectionSubject={{
            id: user.id,
            name: user.name,
            cadence: user.reflectionCadence,
          }}
          retrospectiveEntries={retrospectiveEntries}
        />
      );
    }
    if (currentPage === 'retrospectives') {
      const retrospectiveSubjects: RetrospectiveSubjectOption[] = user
        ? [
            {
              id: user.id,
              label: 'My account',
              detail: user.guides.length > 0 ? 'Visible to permitted guides' : 'Private to you',
              name: user.name,
              cadence: user.reflectionCadence,
              writingPrompt: user.reflectionPrompt,
            },
            ...user.members.filter((entry) => entry.canManageFollowThrough).map((entry) => {
              const workspace = memberWorkspaces.find((workspace) => workspace.member.id === entry.member.id);
              return {
                id: entry.member.id,
                label: entry.member.name,
                detail: `Guide review · ${entry.historyWindow}`,
                name: entry.member.name,
                cadence: workspace?.member.reflectionCadence ?? 'weekly',
                writingPrompt: workspace?.member.reflectionPrompt,
              };
            }),
          ]
        : [];
      const searchParams = new URLSearchParams(location.search);
      if (isCreatingRetrospective) {
        const requestedSubjectId = searchParams.get('subject');
        const initialSubject = retrospectiveSubjects.find((subject) => subject.id === requestedSubjectId)?.id ?? retrospectiveSubjects[0]?.id ?? '';
        const requestedKind = searchParams.get('kind');
        const initialKind: RetrospectiveDraftKind = requestedKind === 'manual' ? 'manual' : 'scheduled';
        return (
          <RetrospectiveCreatePage
            subjects={retrospectiveSubjects}
            initialDraft={{ subjectUserId: initialSubject, kind: initialKind }}
            onCreate={createRetrospective}
            onUpdatePrompt={updateReflectionPrompt}
            panelBgStrong={panelBgStrong}
            panelBorder={panelBorder}
            statGlow={statGlow}
            subtleText={subtleText}
            mutedText={mutedText}
            inputBg={inputBg}
          />
        );
      }
      if (retrospectiveId) {
        return (
          <RetrospectiveDetailPage
            entry={selectedRetrospective}
            onUpdateSummary={updateRetrospectiveSummary}
            onContribute={addRetrospectiveContribution}
            onUpdatePrompt={updateReflectionPrompt}
            panelBgStrong={panelBgStrong}
            panelBorder={panelBorder}
            statGlow={statGlow}
            subtleText={subtleText}
            mutedText={mutedText}
            panelBg={panelBg}
          />
        );
      }
      return (
        <RetrospectivesPage
          entries={retrospectiveEntries}
          subjects={retrospectiveSubjects}
          currentUserId={user.id}
          initialSubjectId={searchParams.get('subject') ?? undefined}
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
    if (currentPage === 'audit-log') {
      return (
        <AuditLogPage
          entries={auditEntries}
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
          retrospectiveEntries={retrospectiveEntries}
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
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={onTemplateChange}
          creationMode={creationMode}
          onCreationModeChange={onCreationModeChange}
          editingItemId={editingItemId}
          onEditItem={editItem}
          onCancelEditing={() => resetItemEditor()}
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
          onSaveItem={async () => {
            try {
              await saveItem();
            } catch (error) {
              toast({ status: 'error', title: String(error) });
            }
          }}
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
                <>
                  <NotificationMailbox
                    user={user}
                    items={items}
                    actionableItems={actionableItems}
                    memberPortfolios={memberPortfolios}
                    buttonBg={accountButtonBg}
                    buttonBorder={accountButtonBorder}
                    iconColor={accountIconColor}
                    panelBg={accountMenuBg}
                    panelBorder={accountMenuBorder}
                    panelHoverBg={accountMenuHoverBg}
                    dividerColor={accountMenuDivider}
                    mutedText={mutedText}
                  />
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
                </>
              )}
            </HStack>
          </Flex>

          {!loggedIn ? (
            inviteToken ? (
              invitePreview ? (
                <InviteAcceptancePage
                  invite={invitePreview}
                  heroGradient={heroGradient}
                  panelBorder={panelBorder}
                  statGlow={statGlow}
                  subtleText={subtleText}
                  mutedText={mutedText}
                  panelBgStrong={panelBgStrong}
                  inputBg={inputBg}
                  registerName={registerName}
                  setRegisterName={setRegisterName}
                  registerEmail={registerEmail}
                  setRegisterEmail={setRegisterEmail}
                  registerPassword={registerPassword}
                  setRegisterPassword={setRegisterPassword}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  oauthProviders={[]}
                  onRegister={registerFromInvite}
                  onLogin={login}
                  onLoginWithProvider={loginWithProvider}
                />
              ) : (
                <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
                  <Heading size="md">Invite unavailable</Heading>
                  <Text mt={3} color={mutedText}>
                    {invitePreviewError ?? 'We could not load this invite.'}
                  </Text>
                </Box>
              )
            ) : (
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
                setupName={setupName}
                setSetupName={setSetupName}
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
            )
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
                  {!hidePageIntro ? (
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
                  ) : null}
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
