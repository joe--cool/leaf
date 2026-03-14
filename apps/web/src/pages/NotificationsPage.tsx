import {
  Badge,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { weekdayOptions } from '../appConstants';
import type {
  ActionableItem,
  Item,
  MemberPortfolio,
  NotificationFeedEntry,
  User,
} from '../appTypes';
import { toDayName } from '../scheduleUtils';

function formatTimestamp(value?: string): string {
  if (!value) return 'Waiting for the first delivered update';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'Waiting for the first delivered update';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildFeedEntries({
  actionableItems,
  user,
  memberPortfolios,
}: {
  actionableItems: ActionableItem[];
  user: User;
  memberPortfolios: MemberPortfolio[];
}): NotificationFeedEntry[] {
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
      };
    });

  return [...memberEntries, ...guideEntries, ...visibilityEntries].sort((left, right) => {
    const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
    const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
    return rightTime - leftTime;
  });
}

export function NotificationsPage({
  user,
  items,
  actionableItems,
  memberPortfolios,
  prefTimezone,
  setPrefTimezone,
  prefDay,
  setPrefDay,
  prefHour,
  setPrefHour,
  digestSummary,
  panelBgStrong,
  panelBorder,
  statGlow,
  mutedText,
  subtleText,
  panelBg,
  inputBg,
  onSaveNotificationPreferences,
}: {
  user: User;
  items: Item[];
  actionableItems: ActionableItem[];
  memberPortfolios: MemberPortfolio[];
  prefTimezone: string;
  setPrefTimezone: (value: string) => void;
  prefDay: string;
  setPrefDay: (value: string) => void;
  prefHour: string;
  setPrefHour: (value: string) => void;
  digestSummary: string;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  mutedText: string;
  subtleText: string;
  panelBg: string;
  inputBg: string;
  onSaveNotificationPreferences: () => Promise<void>;
}) {
  const toast = useToast();
  const feedEntries = buildFeedEntries({ actionableItems, user, memberPortfolios });
  const enabledReminderCount = items.filter((item) => item.notificationEnabled !== false).length;
  const repeatingReminderCount = items.filter(
    (item) => item.notificationEnabled !== false && item.notificationHardToDismiss,
  ).length;
  const repeatMinutes = items
    .filter((item) => item.notificationEnabled !== false && item.notificationHardToDismiss)
    .map((item) => item.notificationRepeatMinutes ?? 15);
  const fastestRepeat = repeatMinutes.length > 0 ? Math.min(...repeatMinutes) : null;

  return (
    <Grid templateColumns={{ base: '1fr', xl: '1.1fr 0.9fr' }} gap={5}>
      <GridItem>
        <Stack spacing={5}>
          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <HStack justify="space-between" align="start" spacing={4} mb={4}>
              <Box>
                <Heading size="md">In-App Feed</Heading>
                <Text color={mutedText} mt={2} maxW="42rem">
                  Notifications live here as a running product feed. Member reminders point to work that still needs
                  acknowledgement, while guide updates keep shared accountability visible without exposing hidden items.
                </Text>
              </Box>
              <Badge colorScheme="leaf" borderRadius="full" px={3} py={1}>
                {feedEntries.length} visible now
              </Badge>
            </HStack>

            <Stack spacing={3}>
              {feedEntries.length === 0 ? (
                <Box borderRadius="2xl" border="1px solid" borderColor={panelBorder} p={5} bg={panelBg}>
                  <Text fontWeight="semibold">No notifications yet</Text>
                  <Text color={mutedText} fontSize="sm" mt={2}>
                    Your feed will start filling in once routines, digest timing, or review relationships begin
                    producing visible updates.
                  </Text>
                </Box>
              ) : (
                feedEntries.map((entry) => (
                  <Box key={entry.id} borderRadius="2xl" border="1px solid" borderColor={panelBorder} p={4} bg={panelBg}>
                    <HStack justify="space-between" align="start" spacing={3} mb={2}>
                      <Stack spacing={1}>
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
                        <Text fontWeight="semibold">{entry.title}</Text>
                      </Stack>
                      <Text fontSize="sm" color={subtleText}>
                        {formatTimestamp(entry.timestamp)}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color={mutedText}>
                      {entry.detail}
                    </Text>
                    <Text fontSize="sm" color={subtleText} mt={2}>
                      {entry.acknowledgement}
                    </Text>
                  </Box>
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      </GridItem>

      <GridItem>
        <Stack spacing={5}>
          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>
              Delivery Channels
            </Heading>
            <Stack spacing={3}>
              <ChannelCard
                title="In-app feed"
                status="Always available"
                body="This page is your shared notification record. Routine reminders, guide updates, and visibility notes collect here first."
                panelBg={panelBg}
                mutedText={mutedText}
              />
              <ChannelCard
                title="Weekly digest"
                status={digestSummary}
                body={`A summary review is sent using your ${prefTimezone || 'current'} timezone. If you guide other people, the digest folds their visible activity into the same cadence instead of creating a separate hidden channel.`}
                panelBg={panelBg}
                mutedText={mutedText}
              />
              <ChannelCard
                title="Routine reminders"
                status={`${enabledReminderCount} of ${items.length} routine${items.length === 1 ? '' : 's'} active`}
                body="Reminder intensity still belongs to each routine so you can keep high-pressure alerts separate from lighter nudges."
                panelBg={panelBg}
                mutedText={mutedText}
              />
            </Stack>
          </Box>

          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>
              Notification Preferences
            </Heading>
            <Text color={mutedText} mb={4}>
              Set the digest cadence here so member and guide summaries follow one predictable review rhythm.
            </Text>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Timezone</FormLabel>
                <Input bg={inputBg} value={prefTimezone} onChange={(event) => setPrefTimezone(event.target.value)} />
                <FormHelperText color={mutedText}>
                  Use an IANA timezone such as `America/Los_Angeles`.
                </FormHelperText>
              </FormControl>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Digest day</FormLabel>
                  <Select bg={inputBg} value={prefDay} onChange={(event) => setPrefDay(event.target.value)}>
                    {weekdayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Digest time</FormLabel>
                  <Select bg={inputBg} value={prefHour} onChange={(event) => setPrefHour(event.target.value)}>
                    {Array.from({ length: 24 }, (_, hour) => hour).map((hour) => (
                      <option key={hour} value={hour}>
                        {hour.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
              <Box borderRadius="2xl" bg={panelBg} p={4}>
                <Text fontWeight="semibold">Current digest plan</Text>
                <Text color={mutedText} fontSize="sm" mt={1}>
                  {`Every ${toDayName(Number(prefDay))} at ${prefHour.padStart(2, '0')}:00 in ${prefTimezone}.`}
                </Text>
              </Box>
              <Button
                colorScheme="leaf"
                alignSelf="start"
                onClick={() => onSaveNotificationPreferences().catch((error) => toast({ status: 'error', title: String(error) }))}
              >
                Save Notifications
              </Button>
            </Stack>
          </Box>

          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>
              Reminder Coverage
            </Heading>
            <Text color={mutedText} mb={4}>
              Use this summary to understand reminder pressure without reopening each routine one by one.
            </Text>
            <Stack spacing={3}>
              <SummaryRow
                label="Routines with reminders"
                value={`${enabledReminderCount}/${items.length}`}
                detail="Only reminder-enabled routines contribute member alerts to this feed."
                panelBg={panelBg}
                mutedText={mutedText}
              />
              <SummaryRow
                label="Persistent reminders"
                value={`${repeatingReminderCount}`}
                detail={
                  fastestRepeat
                    ? `The fastest repeat policy is every ${fastestRepeat} minutes.`
                    : 'No routine is currently set to repeat until handled.'
                }
                panelBg={panelBg}
                mutedText={mutedText}
              />
            </Stack>
            <Button as={RouterLink} to="/routines" mt={5} size="sm" variant="outline">
              Review routine reminder settings
            </Button>
          </Box>
        </Stack>
      </GridItem>
    </Grid>
  );
}

function ChannelCard({
  title,
  status,
  body,
  panelBg,
  mutedText,
}: {
  title: string;
  status: string;
  body: string;
  panelBg: string;
  mutedText: string;
}) {
  return (
    <Box borderRadius="2xl" p={4} bg={panelBg}>
      <HStack justify="space-between" align="start" spacing={3}>
        <Box>
          <Text fontWeight="semibold">{title}</Text>
          <Text fontSize="sm" color={mutedText} mt={1}>
            {body}
          </Text>
        </Box>
        <Badge borderRadius="full" px={3} py={1}>
          {status}
        </Badge>
      </HStack>
    </Box>
  );
}

function SummaryRow({
  label,
  value,
  detail,
  panelBg,
  mutedText,
}: {
  label: string;
  value: string;
  detail: string;
  panelBg: string;
  mutedText: string;
}) {
  return (
    <Box borderRadius="2xl" p={4} bg={panelBg}>
      <HStack justify="space-between" align="start" spacing={3}>
        <Box>
          <Text fontWeight="semibold">{label}</Text>
          <Text fontSize="sm" color={mutedText} mt={1}>
            {detail}
          </Text>
        </Box>
        <Text fontWeight="semibold">{value}</Text>
      </HStack>
    </Box>
  );
}
