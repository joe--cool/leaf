import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Stack,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { buildAccountabilitySummary } from '../accountabilityUtils';
import { buildReflectionDraftPath } from '../reflectionUtils';
import { summarizeOccurrenceNote, summarizeSchedule } from '../scheduleUtils';
import { AccountabilitySummaryBlock } from '../components/AccountabilitySummary';
import type { ActionableItem, Item, RetrospectiveEntry } from '../appTypes';

type OccurrenceActionKind = 'complete' | 'skip' | 'note';

export function MyItemsPage({
  items,
  actionableItems,
  modeGradient,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBg,
  reflectionSubject,
  retrospectiveEntries,
  onOccurrenceAction,
}: {
  items: Item[];
  actionableItems: ActionableItem[];
  modeGradient: string;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBg: string;
  reflectionSubject: { id: string; name: string; cadence: 'daily' | 'weekly' | 'monthly' };
  retrospectiveEntries: RetrospectiveEntry[];
  onOccurrenceAction: (input: {
    itemId: string;
    kind: OccurrenceActionKind;
    targetAt: string;
    note?: string;
  }) => Promise<void>;
}) {
  const toast = useToast();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const accountability = buildAccountabilitySummary(items);
  const reflectionPath = buildReflectionDraftPath({
    ...reflectionSubject,
    retrospectives: retrospectiveEntries.filter((entry) => entry.subjectUserId === reflectionSubject.id),
  });

  const nowItems = actionableItems.filter((entry) => entry.action.bucket === 'due');
  const thisWeekItems = actionableItems.filter((entry) => {
    if (entry.action.bucket !== 'upcoming') return false;
    if (entry.item.scheduleKind === 'ONE_TIME') return false;
    if (!entry.action.dueAt) return false;
    return entry.action.dueAt - Date.now() <= 1000 * 60 * 60 * 24 * 7;
  });
  const upcomingOneTimeItems = actionableItems.filter(
    (entry) => entry.item.scheduleKind === 'ONE_TIME' && entry.action.bucket === 'upcoming',
  );

  const queueCount = nowItems.length + thisWeekItems.length + upcomingOneTimeItems.length;

  async function submitAction(entry: ActionableItem, kind: OccurrenceActionKind) {
    const targetAt = entry.action.occurrenceAt;
    if (!targetAt) return;

    const key = `${entry.item.id}:${kind}`;
    setBusyKey(key);
    try {
      const note = noteDrafts[entry.item.id]?.trim() || undefined;
      await onOccurrenceAction({
        itemId: entry.item.id,
        kind,
        targetAt,
        note,
      });
      if (kind === 'note') {
        toast({ status: 'success', title: 'Occurrence note saved' });
      }
    } catch (error) {
      toast({ status: 'error', title: String(error) });
    } finally {
      setBusyKey(null);
    }
  }

  const emptyMessage = useMemo(() => {
    if (items.length === 0) return 'Create tracked items in Routines, then come back here to work the queue.';
    if (queueCount === 0) return 'Nothing needs action right now. Your next queue will appear here as new occurrences come due.';
    return null;
  }, [items.length, queueCount]);

  return (
    <Grid templateColumns={{ base: '1fr', xl: '1.08fr 0.92fr' }} gap={5}>
      <GridItem>
        <Stack spacing={5}>
          <Box bgGradient={modeGradient} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
              Action Queue
            </Text>
            <Heading size="lg" mt={2}>
              {nowItems.length > 0 ? 'Handle what needs action now' : 'Momentum stays here'}
            </Heading>
            <Text mt={3} maxW="36rem" color={mutedText}>
              {emptyMessage ??
                `${nowItems.length} due now, ${thisWeekItems.length} coming up this week, and ${upcomingOneTimeItems.length} one-time item${upcomingOneTimeItems.length === 1 ? '' : 's'} ahead.`}
            </Text>
            <Box mt={5} borderRadius="2xl" px={4} py={4} bg={panelBg}>
              <AccountabilitySummaryBlock summary={accountability} mutedText={mutedText} subtleText={subtleText} />
            </Box>
            <HStack mt={5} spacing={3} flexWrap="wrap">
              <Button as={RouterLink} to={reflectionPath} colorScheme="clay" size="sm" aria-label="Open reflection for myself">
                Open Reflection
              </Button>
              <Button as={RouterLink} to="/routines" colorScheme="leaf" size="sm">
                Manage routines
              </Button>
              <Button as={RouterLink} to="/profile" variant="outline" size="sm">
                Open profile & relationships
              </Button>
            </HStack>
          </Box>

          <OccurrenceSection
            title="Now"
            badgeColor="orange"
            items={nowItems}
            emptyText={items.length === 0 ? 'No active queue yet.' : 'Nothing is due right now.'}
            panelBg={panelBg}
            panelBgStrong={panelBgStrong}
            panelBorder={panelBorder}
            statGlow={statGlow}
            subtleText={subtleText}
            mutedText={mutedText}
            noteDrafts={noteDrafts}
            onNoteDraftChange={setNoteDrafts}
            busyKey={busyKey}
            onSubmitAction={submitAction}
          />
        </Stack>
      </GridItem>

      <GridItem>
        <Stack spacing={5}>
          <OccurrenceSection
            title="This Week"
            badgeColor="green"
            items={thisWeekItems}
            emptyText={items.length === 0 ? 'No recurring work yet.' : 'No recurring work is queued for the next 7 days.'}
            panelBg={panelBg}
            panelBgStrong={panelBgStrong}
            panelBorder={panelBorder}
            statGlow={statGlow}
            subtleText={subtleText}
            mutedText={mutedText}
            noteDrafts={noteDrafts}
            onNoteDraftChange={setNoteDrafts}
            busyKey={busyKey}
            onSubmitAction={submitAction}
          />
          <OccurrenceSection
            title="Upcoming One-Time Work"
            badgeColor="purple"
            items={upcomingOneTimeItems}
            emptyText={items.length === 0 ? 'No one-time work yet.' : 'No upcoming one-time work is scheduled right now.'}
            panelBg={panelBg}
            panelBgStrong={panelBgStrong}
            panelBorder={panelBorder}
            statGlow={statGlow}
            subtleText={subtleText}
            mutedText={mutedText}
            noteDrafts={noteDrafts}
            onNoteDraftChange={setNoteDrafts}
            busyKey={busyKey}
            onSubmitAction={submitAction}
          />
        </Stack>
      </GridItem>
    </Grid>
  );
}

function OccurrenceSection({
  title,
  badgeColor,
  items,
  emptyText,
  panelBg,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  noteDrafts,
  onNoteDraftChange,
  busyKey,
  onSubmitAction,
}: {
  title: string;
  badgeColor: string;
  items: ActionableItem[];
  emptyText: string;
  panelBg: string;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  noteDrafts: Record<string, string>;
  onNoteDraftChange: Dispatch<SetStateAction<Record<string, string>>>;
  busyKey: string | null;
  onSubmitAction: (entry: ActionableItem, kind: OccurrenceActionKind) => Promise<void>;
}) {
  return (
    <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
      <HStack justify="space-between" align="center" mb={4}>
        <Heading size="md">{title}</Heading>
        <Badge colorScheme={badgeColor} borderRadius="full" px={3} py={1}>
          {items.length}
        </Badge>
      </HStack>
      <Stack spacing={3}>
        {items.map((entry) => {
          const note = summarizeOccurrenceNote(entry.item, entry.action.occurrenceAt);
          const draft = noteDrafts[entry.item.id] ?? note ?? '';

          return (
            <Box key={`${entry.item.id}-${entry.action.occurrenceAt ?? entry.action.status}`} border="1px solid" borderColor={panelBorder} borderRadius="2xl" p={4} bg={panelBg}>
              <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={3} direction={{ base: 'column', md: 'row' }}>
                <Box>
                  <HStack spacing={2} mb={2} flexWrap="wrap">
                    <Badge colorScheme={entry.action.status === 'Overdue' ? 'red' : entry.action.bucket === 'due' ? 'orange' : 'green'} borderRadius="full" px={3} py={1}>
                      {entry.action.status}
                    </Badge>
                  </HStack>
                  <Text fontWeight="semibold">{entry.item.title}</Text>
                  <Text color={mutedText} fontSize="sm" mt={1}>
                    {entry.action.detail}
                  </Text>
                  <Text color={subtleText} fontSize="sm" mt={2}>
                    {summarizeSchedule(entry.item)}
                  </Text>
                  {note ? (
                    <Box mt={3} borderRadius="xl" px={3} py={2} bg={panelBgStrong}>
                      <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.12em" color={subtleText}>
                        Current note
                      </Text>
                      <Text mt={1} fontSize="sm">
                        {note}
                      </Text>
                    </Box>
                  ) : null}
                </Box>
              </Flex>
              <Stack spacing={3} mt={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Occurrence note
                  </Text>
                  <Textarea
                    value={draft}
                    onChange={(event) =>
                      onNoteDraftChange((current) => ({
                        ...current,
                        [entry.item.id]: event.target.value,
                      }))
                    }
                    placeholder="Add context, obstacles, or what changed."
                    aria-label={`Occurrence note for ${entry.item.title}`}
                    rows={3}
                    resize="vertical"
                  />
                </Box>
                <HStack spacing={3} flexWrap="wrap">
                  <Button
                    colorScheme="leaf"
                    size="sm"
                    onClick={() => onSubmitAction(entry, 'complete')}
                    isLoading={busyKey === `${entry.item.id}:complete`}
                    isDisabled={!entry.action.occurrenceAt}
                    aria-label={`Complete ${entry.item.title}`}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSubmitAction(entry, 'skip')}
                    isLoading={busyKey === `${entry.item.id}:skip`}
                    isDisabled={!entry.action.occurrenceAt}
                    aria-label={`Skip ${entry.item.title}`}
                  >
                    Skip
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSubmitAction(entry, 'note')}
                    isLoading={busyKey === `${entry.item.id}:note`}
                    isDisabled={!entry.action.occurrenceAt}
                    aria-label={`Save note for ${entry.item.title}`}
                  >
                    Save note
                  </Button>
                </HStack>
              </Stack>
            </Box>
          );
        })}
        {items.length === 0 ? (
          <Box bg={panelBg} borderRadius="2xl" p={5}>
            <Text color={mutedText}>{emptyText}</Text>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}
