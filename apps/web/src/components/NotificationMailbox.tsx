import { BellIcon } from '@chakra-ui/icons';
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Heading,
  HStack,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Portal,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type {
  ActionableItem,
  Item,
  MemberPortfolio,
  NotificationFeedEntry,
  User,
} from '../appTypes';

type MailboxEntry = NotificationFeedEntry & {
  ctaLabel: string;
  to: string;
};

const unreadStorageKey = 'leaf_notification_mailbox_read';
const desktopStorageKey = 'leaf_notification_desktop_alerts';

function formatTimestamp(value?: string): string {
  if (!value) return 'Waiting for the first delivered update';
  const date = new Date(value);
  if (!Number.isNaN(date.valueOf())) {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return 'Waiting for the first delivered update';
}

function buildMailboxEntries({
  actionableItems,
  user,
  memberPortfolios,
}: {
  actionableItems: ActionableItem[];
  user: User;
  memberPortfolios: MemberPortfolio[];
}): MailboxEntry[] {
  const memberEntries = actionableItems
    .filter(({ item, action }) => item.notificationEnabled !== false && action.bucket !== 'later')
    .slice(0, 4)
    .map(({ item, action }) => ({
      id: `member-${item.id}`,
      category: 'member' as const,
      title: item.title,
      detail: action.detail,
      timestamp: item.updatedAt ?? item.createdAt,
      status: action.status,
      acknowledgement:
        item.notificationHardToDismiss && item.notificationRepeatMinutes
          ? `Repeats every ${item.notificationRepeatMinutes} minutes until you complete or skip it.`
          : 'Acknowledge by completing or skipping the routine.',
      ctaLabel: 'Open My Items',
      to: '/my-items',
    }));

  const guideEntries = memberPortfolios
    .flatMap((portfolio) =>
      portfolio.recentActivity.slice(0, 2).map((activity) => ({
        id: `guide-${portfolio.member.id}-${activity.id}`,
        category: 'guide' as const,
        title: `${portfolio.member.name}: ${activity.itemTitle}`,
        detail: activity.note?.trim() || 'A visible completion was recorded for this member.',
        timestamp: activity.occurredAt,
        status: portfolio.relationship.mode === 'active' ? 'Guide update' : 'Passive update',
        acknowledgement:
          portfolio.relationship.mode === 'active'
            ? 'Review the member workspace if this changes what needs support next.'
            : 'Informational only. Passive relationships do not require an intervention response.',
        ctaLabel: 'Open Members',
        to: '/members',
      })),
    )
    .slice(0, 5);

  const visibilityEntries = [...user.guides, ...user.members]
    .filter((entry) => (entry.hiddenItemCount ?? 0) > 0 || entry.mode === 'passive')
    .slice(0, 3)
    .map((entry, index) => {
      const personName = 'guide' in entry ? entry.guide.name : entry.member.name;
      const direction = 'guide' in entry ? 'Guide for you' : 'Member you guide';
      const hiddenCount = entry.hiddenItemCount ?? 0;
      return {
        id: `visibility-${index}-${personName}`,
        category: 'visibility' as const,
        title: `${direction}: ${personName}`,
        detail:
          hiddenCount > 0
            ? `${hiddenCount} hidden item${hiddenCount === 1 ? ' stays' : 's stay'} outside this relationship view.`
            : 'This relationship is visibility-first, so updates stay summary-oriented.',
        timestamp: entry.createdAt,
        status: entry.mode === 'active' ? 'Visibility boundary' : 'Observation only',
        acknowledgement: 'No dismissal needed. Keep this visible so privacy limits stay explicit.',
        ctaLabel: 'Open Profile',
        to: '/profile',
      };
    });

  return [...memberEntries, ...guideEntries, ...visibilityEntries].sort((left, right) => {
    const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
    const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
    return rightTime - leftTime;
  });
}

export function NotificationMailbox({
  user,
  items,
  actionableItems,
  memberPortfolios,
  buttonBg,
  buttonBorder,
  iconColor,
  panelBg,
  panelBorder,
  panelHoverBg,
  dividerColor,
  mutedText,
}: {
  user: User;
  items: Item[];
  actionableItems: ActionableItem[];
  memberPortfolios: MemberPortfolio[];
  buttonBg: string;
  buttonBorder: string;
  iconColor: string;
  panelBg: string;
  panelBorder: string;
  panelHoverBg: string;
  dividerColor: string;
  mutedText: string;
}) {
  const toast = useToast();
  const entries = useMemo(
    () => buildMailboxEntries({ actionableItems, user, memberPortfolios }),
    [actionableItems, memberPortfolios, user],
  );
  const entryIds = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [readIds, setReadIds] = useState<string[]>([]);
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState(false);
  const previousEntryIds = useRef<string[] | null>(null);

  useEffect(() => {
    const storedRead = window.localStorage.getItem(`${unreadStorageKey}:${user.id}`);
    if (storedRead) {
      try {
        setReadIds(JSON.parse(storedRead) as string[]);
      } catch {
        setReadIds([]);
      }
    } else {
      setReadIds([]);
    }

    const desktopOptIn = window.localStorage.getItem(`${desktopStorageKey}:${user.id}`) === 'true';
    setDesktopAlertsEnabled(desktopOptIn);
    previousEntryIds.current = null;
  }, [user.id]);

  useEffect(() => {
    window.localStorage.setItem(`${unreadStorageKey}:${user.id}`, JSON.stringify(readIds));
  }, [readIds, user.id]);

  const unreadEntries = useMemo(
    () => entries.filter((entry) => !readIds.includes(entry.id)),
    [entries, readIds],
  );
  const visibleEntries = filter === 'unread' ? unreadEntries : entries;
  const unreadCount = unreadEntries.length;

  useEffect(() => {
    if (previousEntryIds.current === null) {
      previousEntryIds.current = entryIds;
      return;
    }

    const newEntries = entries.filter((entry) => !previousEntryIds.current?.includes(entry.id));
    previousEntryIds.current = entryIds;

    if (newEntries.length === 0) return;

    const freshEntry = newEntries[0]!;
    toast({
      title: freshEntry.title,
      description: freshEntry.detail,
      duration: 5000,
      isClosable: true,
      position: 'bottom-right',
      variant: 'subtle',
      colorScheme: freshEntry.category === 'member' ? 'orange' : freshEntry.category === 'guide' ? 'leaf' : 'gray',
    });

    if (
      desktopAlertsEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      // This is a foreground desktop alert, not a service-worker push channel.
      new window.Notification(freshEntry.title, {
        body: freshEntry.detail,
        tag: freshEntry.id,
      });
    }
  }, [desktopAlertsEnabled, entries, entryIds, toast]);

  function markAllRead() {
    setReadIds((current) => Array.from(new Set([...current, ...entryIds])));
  }

  function markRead(entryId: string) {
    setReadIds((current) => (current.includes(entryId) ? current : [...current, entryId]));
  }

  async function enableDesktopAlerts() {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await window.Notification.requestPermission();
    if (permission === 'granted') {
      window.localStorage.setItem(`${desktopStorageKey}:${user.id}`, 'true');
      setDesktopAlertsEnabled(true);
      toast({
        status: 'success',
        title: 'Desktop alerts enabled',
        position: 'bottom-right',
        variant: 'subtle',
        colorScheme: 'leaf',
      });
    }
  }

  const reminderEnabledCount = items.filter((item) => item.notificationEnabled !== false).length;

  return (
    <Popover placement="bottom-end" autoFocus={false} returnFocusOnClose>
      <PopoverTrigger>
        <Box position="relative">
          <IconButton
            aria-label="Open notifications inbox"
            icon={<BellIcon />}
            variant="ghost"
            borderRadius="full"
            bg={buttonBg}
            border="1px solid"
            borderColor={buttonBorder}
            color={iconColor}
            boxShadow="0 10px 24px rgba(0, 0, 0, 0.06)"
            _hover={{ bg: buttonBg, borderColor: buttonBorder }}
            _active={{ bg: buttonBg }}
          />
          {unreadCount > 0 ? (
            <Badge
              position="absolute"
              top="-1"
              right="-1"
              colorScheme="orange"
              borderRadius="full"
              minW="1.4rem"
              textAlign="center"
              px={2}
              py={0.5}
              data-testid="notification-mailbox-badge"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          ) : null}
        </Box>
      </PopoverTrigger>
      <Portal>
        <PopoverContent
          data-testid="notification-mailbox"
          w={{ base: 'calc(100vw - 2rem)', md: '26rem' }}
          maxW="26rem"
          borderRadius="2xl"
          bg={panelBg}
          border="1px solid"
          borderColor={panelBorder}
          boxShadow="0 24px 64px rgba(0, 0, 0, 0.16)"
          overflow="hidden"
          zIndex={2000}
        >
          <PopoverHeader borderBottom="1px solid" borderColor={dividerColor} px={5} py={4}>
            <HStack justify="space-between" align="start">
              <Box>
                <Heading size="sm">Inbox</Heading>
                <Text fontSize="sm" color={mutedText} mt={1}>
                  Alerts, shared activity, and visibility notes in one place.
                </Text>
              </Box>
              {unreadCount > 0 ? (
                <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                  {unreadCount} unread
                </Badge>
              ) : null}
            </HStack>
            <HStack justify="space-between" mt={4}>
              <ButtonGroup size="sm" isAttached variant="outline">
                <Button onClick={() => setFilter('unread')} isActive={filter === 'unread'}>
                  Unread
                </Button>
                <Button onClick={() => setFilter('all')} isActive={filter === 'all'}>
                  All
                </Button>
              </ButtonGroup>
              <Button size="sm" variant="ghost" onClick={markAllRead} isDisabled={unreadCount === 0}>
                Mark all read
              </Button>
            </HStack>
          </PopoverHeader>
          <PopoverBody px={0} py={0}>
            <Stack spacing={0} maxH="32rem" overflowY="auto">
              {visibleEntries.length === 0 ? (
                <Box px={5} py={6}>
                  <Text fontWeight="semibold">No notifications</Text>
                  <Text fontSize="sm" color={mutedText} mt={2}>
                    {filter === 'unread'
                      ? 'Everything is caught up right now.'
                      : 'This inbox will fill in as routines and guide activity produce updates.'}
                  </Text>
                </Box>
              ) : (
                visibleEntries.map((entry) => {
                  const unread = !readIds.includes(entry.id);
                  return (
                    <Box
                      key={entry.id}
                      px={5}
                      py={4}
                      borderTop="1px solid"
                      borderColor={dividerColor}
                      bg={unread ? panelHoverBg : 'transparent'}
                    >
                      <HStack justify="space-between" align="start" spacing={3} mb={2}>
                        <HStack spacing={2} flexWrap="wrap">
                          <Badge
                            colorScheme={
                              entry.category === 'member'
                                ? 'orange'
                                : entry.category === 'guide'
                                  ? 'green'
                                  : 'gray'
                            }
                            borderRadius="full"
                            px={3}
                            py={1}
                          >
                            {entry.category === 'member'
                              ? 'Member reminder'
                              : entry.category === 'guide'
                                ? 'Guide update'
                                : 'Visibility note'}
                          </Badge>
                          <Badge variant="subtle" borderRadius="full" px={3} py={1}>
                            {entry.status}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color={mutedText}>
                          {formatTimestamp(entry.timestamp)}
                        </Text>
                      </HStack>
                      <Text fontWeight="semibold">{entry.title}</Text>
                      <Text fontSize="sm" color={mutedText} mt={2}>
                        {entry.detail}
                      </Text>
                      <Text fontSize="sm" color={mutedText} mt={2}>
                        {entry.acknowledgement}
                      </Text>
                      <HStack justify="space-between" mt={3}>
                        <Button
                          as={RouterLink}
                          to={entry.to}
                          size="sm"
                          variant="outline"
                          onClick={() => markRead(entry.id)}
                        >
                          {entry.ctaLabel}
                        </Button>
                        {unread ? (
                          <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                            New
                          </Badge>
                        ) : null}
                      </HStack>
                    </Box>
                  );
                })
              )}
            </Stack>
            <Box px={5} py={4} borderTop="1px solid" borderColor={dividerColor}>
              <Stack spacing={3}>
                <Text fontSize="sm" color={mutedText}>
                  {`${reminderEnabledCount} routine${reminderEnabledCount === 1 ? '' : 's'} can raise member alerts. Digest timing stays under Profile & Relationships.`}
                </Text>
                <HStack justify="space-between" align="center">
                  <Button as={RouterLink} to="/profile" size="sm" variant="ghost">
                    Open Profile
                  </Button>
                  {typeof window !== 'undefined' && 'Notification' in window ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => enableDesktopAlerts().catch(() => undefined)}
                      isDisabled={desktopAlertsEnabled && window.Notification.permission === 'granted'}
                    >
                      {desktopAlertsEnabled && window.Notification.permission === 'granted'
                        ? 'Desktop alerts on'
                        : 'Enable desktop alerts'}
                    </Button>
                  ) : null}
                </HStack>
              </Stack>
            </Box>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
}
