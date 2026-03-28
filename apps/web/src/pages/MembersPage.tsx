import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { buildAccountabilitySummary } from '../accountabilityUtils';
import { buildReflectionDraftPath, cadenceLabel, scheduledReflectionDue } from '../reflectionUtils';
import { AccountabilitySummaryBlock, PrivacyDisclosure } from '../components/AccountabilitySummary';
import { relationshipHistoryWindowLabel } from '../relationshipUi';
import {
  getCategoryLabel,
  summarizeOccurrenceNoteDetails,
  summarizeRecentMemberContext,
  summarizeSchedule,
} from '../scheduleUtils';
import type { ActionableItem, MemberPortfolio, RetrospectiveEntry } from '../appTypes';

type OccurrenceActionKind = 'complete' | 'skip' | 'note';

export function MembersPage({
  canReviewOthers,
  memberPortfolios,
  retrospectiveEntries,
  onOccurrenceAction,
  modeGradient,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBg,
}: {
  canReviewOthers: boolean;
  memberPortfolios: MemberPortfolio[];
  retrospectiveEntries: RetrospectiveEntry[];
  onOccurrenceAction: (input: {
    memberId: string;
    itemId: string;
    kind: OccurrenceActionKind;
    targetAt: string;
    note?: string;
  }) => Promise<void>;
  modeGradient: string;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBg: string;
}) {
  const toast = useToast();
  const [selectedMemberId, setSelectedMemberId] = useState(memberPortfolios[0]?.member.id ?? '');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMemberId && memberPortfolios[0]?.member.id) {
      setSelectedMemberId(memberPortfolios[0].member.id);
    }
  }, [memberPortfolios, selectedMemberId]);

  if (!canReviewOthers) {
    return (
      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Heading size="md">No members yet</Heading>
        <Text mt={3} color={mutedText} maxW="38rem">
          This workspace appears when someone is connected to you as a member. Use Profile & Relationships to
          send an invite or set up the relationship first.
        </Text>
        <Button as={RouterLink} to="/profile" mt={5} colorScheme="leaf" size="sm">
          Open Profile & Relationships
        </Button>
      </Box>
    );
  }

  const selectedWorkspace = memberPortfolios.find((workspace) => workspace.member.id === selectedMemberId) ?? memberPortfolios[0]!;
  const guideSummary = buildAccountabilitySummary(memberPortfolios.flatMap((entry) => entry.items));
  const nowItems = selectedWorkspace.actionable.filter((entry) => entry.action.bucket === 'due');
  const upcomingItems = selectedWorkspace.actionable.filter((entry) => entry.action.bucket === 'upcoming');
  const recentContext = useMemo(() => summarizeRecentMemberContext(selectedWorkspace.items), [selectedWorkspace.items]);
  const memberReflections = retrospectiveEntries
    .filter((entry) => entry.subjectUserId === selectedWorkspace.member.id)
    .sort((left, right) => right.periodEnd.localeCompare(left.periodEnd));
  const latestReflection = memberReflections[0] ?? null;
  const latestScheduled = memberReflections.find((entry) => entry.kind === 'scheduled') ?? null;
  const scheduledDue = scheduledReflectionDue(selectedWorkspace.member.reflectionCadence, latestScheduled);
  const canManageReflections = selectedWorkspace.relationship.canManageFollowThrough;
  const canActOnItems = selectedWorkspace.relationship.canActOnItems;
  const reflectionPath = buildReflectionDraftPath({
    id: selectedWorkspace.member.id,
    name: selectedWorkspace.member.name,
    cadence: selectedWorkspace.member.reflectionCadence,
    retrospectives: memberReflections,
  });

  async function submitOccurrenceAction(entry: ActionableItem, kind: OccurrenceActionKind) {
    const targetAt = entry.action.occurrenceAt;
    if (!targetAt) return;

    const key = `${selectedWorkspace.member.id}:${entry.item.id}:${kind}`;
    setBusyKey(key);
    try {
      const note = noteDrafts[`${selectedWorkspace.member.id}:${entry.item.id}`]?.trim() || undefined;
      await onOccurrenceAction({
        memberId: selectedWorkspace.member.id,
        itemId: entry.item.id,
        kind,
        targetAt,
        note,
      });
      if (kind === 'note') {
        toast({ status: 'success', title: 'Member occurrence note saved' });
      }
    } catch (error) {
      toast({ status: 'error', title: String(error) });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Stack spacing={5}>
      <Grid templateColumns={{ base: '1fr', xl: '1.08fr 0.92fr' }} gap={5}>
        <GridItem>
          <Box bgGradient={modeGradient} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
              Guide Focus
            </Text>
            <Heading size="lg" mt={2}>
              {selectedWorkspace ? `Review ${selectedWorkspace.member.name}` : 'Members will appear here'}
            </Heading>
            <Text mt={3} maxW="38rem" color={mutedText}>
              Use the member list to move person by person. This page stays operational: latest reflection state, due
              reflection creation, urgent items, and recent context for the selected member.
            </Text>
            <Box mt={5} borderRadius="2xl" px={4} py={4} bg={panelBg}>
              <AccountabilitySummaryBlock
                summary={guideSummary}
                mutedText={mutedText}
                subtleText={subtleText}
                scopeLabel="Guide-visible only."
              />
            </Box>
          </Box>
        </GridItem>

        <GridItem>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 1 }} spacing={4}>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>People you guide</StatLabel>
              <StatNumber>{memberPortfolios.length}</StatNumber>
            </Stat>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>Overdue signals</StatLabel>
              <StatNumber>{memberPortfolios.reduce((total, entry) => total + entry.overdue.length, 0)}</StatNumber>
            </Stat>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>Due reflections</StatLabel>
              <StatNumber>
                {memberPortfolios.filter((entry) =>
                  scheduledReflectionDue(
                    entry.member.reflectionCadence,
                    retrospectiveEntries.find((item) => item.subjectUserId === entry.member.id && item.kind === 'scheduled') ?? null,
                  ),
                ).length}
              </StatNumber>
            </Stat>
          </SimpleGrid>
        </GridItem>
      </Grid>

      <PrivacyDisclosure
        hiddenItemCount={selectedWorkspace.relationship.hiddenItemCount}
        hiddenItemVisibility={selectedWorkspace.relationship.hiddenItemVisibility}
        historyWindow={selectedWorkspace.relationship.historyWindow}
        mutedText={mutedText}
        subtleText={subtleText}
      />

      <Grid templateColumns={{ base: '1fr', xl: '320px minmax(0, 1fr)' }} gap={5} alignItems="start">
        <GridItem>
          <Box bg={panelBgStrong} borderRadius="3xl" p={4} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText} mb={3}>
              Members
            </Text>
            <Stack spacing={3} maxH={{ xl: '720px' }} overflowY="auto" pr={1}>
              {memberPortfolios.map((workspace) => {
                const selected = workspace.member.id === selectedWorkspace.member.id;
                const latest = retrospectiveEntries.find((entry) => entry.subjectUserId === workspace.member.id);
                const due = scheduledReflectionDue(
                  workspace.member.reflectionCadence,
                  retrospectiveEntries.find((entry) => entry.subjectUserId === workspace.member.id && entry.kind === 'scheduled') ?? null,
                );

                return (
                  <Box
                    key={workspace.member.id}
                    as="button"
                    type="button"
                    bg={selected ? panelBg : 'transparent'}
                    borderRadius="2xl"
                    border="1px solid"
                    borderColor={selected ? panelBorder : 'transparent'}
                    p={4}
                    cursor="pointer"
                    textAlign="left"
                    width="100%"
                    aria-pressed={selected}
                    aria-label={`Review ${workspace.member.name}`}
                    onClick={() => setSelectedMemberId(workspace.member.id)}
                  >
                    <HStack spacing={2} flexWrap="wrap" mb={2}>
                      <Text fontWeight="semibold">{workspace.member.name}</Text>
                      <Badge
                        bg={workspace.relationship.mode === 'active' ? 'leaf.100' : 'blackAlpha.100'}
                        color={workspace.relationship.mode === 'active' ? 'leaf.800' : 'inherit'}
                        _dark={{
                          bg: workspace.relationship.mode === 'active' ? 'leaf.800' : 'whiteAlpha.160',
                          color: workspace.relationship.mode === 'active' ? 'leaf.100' : 'inherit',
                        }}
                        borderRadius="full"
                        px={3}
                        py={1}
                      >
                        {workspace.relationship.mode === 'active' ? 'Active guide' : 'Passive guide'}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color={mutedText}>
                      {workspace.overdue.length > 0
                        ? `${workspace.overdue.length} overdue signal${workspace.overdue.length === 1 ? '' : 's'}`
                        : workspace.nextUrgent?.action.detail ?? 'No visible urgent items'}
                    </Text>
                    <Text fontSize="sm" color={subtleText} mt={1}>
                      {latest ? `Latest reflection: ${latest.title}` : due ? 'Scheduled reflection due' : 'No reflection yet'}
                    </Text>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Stack spacing={5}>
            <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <Flex justify="space-between" align={{ base: 'start', lg: 'center' }} direction={{ base: 'column', lg: 'row' }} gap={4}>
                <Box>
                  <HStack spacing={3} flexWrap="wrap">
                    <Heading size="md">{selectedWorkspace.member.name}</Heading>
                    <Badge borderRadius="full" px={3} py={1}>
                      {cadenceLabel(selectedWorkspace.member.reflectionCadence)}
                    </Badge>
                    {selectedWorkspace.relationship.mode !== 'active' ? (
                      <Badge borderRadius="full" px={3} py={1}>
                        Observation only
                      </Badge>
                    ) : null}
                  </HStack>
                  <Text color={mutedText} mt={2}>
                    {selectedWorkspace.member.email}
                  </Text>
                  <HStack spacing={2} mt={3} flexWrap="wrap">
                    <Badge borderRadius="full" px={3} py={1} colorScheme={canActOnItems ? 'leaf' : 'gray'}>
                      {canActOnItems ? 'Can act on items' : 'Observation only'}
                    </Badge>
                    <Badge
                      borderRadius="full"
                      px={3}
                      py={1}
                      colorScheme={selectedWorkspace.relationship.canManageFollowThrough ? 'clay' : 'gray'}
                    >
                      {selectedWorkspace.relationship.canManageFollowThrough ? 'Can manage accountability' : 'No accountability changes'}
                    </Badge>
                    <Badge
                      borderRadius="full"
                      px={3}
                      py={1}
                      colorScheme={selectedWorkspace.relationship.canManageRoutines ? 'leaf' : 'gray'}
                    >
                      {selectedWorkspace.relationship.canManageRoutines ? 'Routine support allowed' : 'No routine changes'}
                    </Badge>
                  </HStack>
                  <Text color={mutedText} fontSize="sm" mt={3}>
                    Visibility: {relationshipHistoryWindowLabel(selectedWorkspace.relationship.historyWindow)}. Guide actions
                    stay attributed to the acting person.
                  </Text>
                </Box>
                <HStack spacing={3} flexWrap="wrap">
                  <Button
                    as={RouterLink}
                    to={`/retrospectives?subject=${encodeURIComponent(selectedWorkspace.member.id)}`}
                    variant="outline"
                  >
                    Open in Looking Back
                  </Button>
                  <Button as={RouterLink} to="/audit-log" variant="ghost">
                    Open Audit Log
                  </Button>
                </HStack>
              </Flex>
            </Box>

            <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <Heading size="md">Reflection status</Heading>
              {latestReflection ? (
                <Box mt={4} bg={panelBg} borderRadius="2xl" p={4}>
                  <HStack spacing={2} flexWrap="wrap" mb={2}>
                    <Badge
                      bg={latestReflection.kind === 'scheduled' ? 'leaf.100' : 'clay.200'}
                      color={latestReflection.kind === 'scheduled' ? 'leaf.800' : 'clay.900'}
                      _dark={{
                        bg: latestReflection.kind === 'scheduled' ? 'leaf.800' : 'clay.700',
                        color: latestReflection.kind === 'scheduled' ? 'leaf.100' : 'clay.50',
                      }}
                      borderRadius="full"
                      px={3}
                      py={1}
                    >
                      {latestReflection.kind === 'scheduled' ? cadenceLabel(selectedWorkspace.member.reflectionCadence) : 'Impromptu Reflection'}
                    </Badge>
                    <Badge variant="outline" borderRadius="full" px={3} py={1}>
                      Latest
                    </Badge>
                  </HStack>
                  <Text fontWeight="semibold">{latestReflection.title}</Text>
                  <Text color={mutedText} mt={2}>
                    {latestReflection.summary?.trim() || 'No summary has been written yet.'}
                  </Text>
                  <Text color={subtleText} mt={2}>
                    {formatRange(latestReflection.periodStart, latestReflection.periodEnd)}
                  </Text>
                </Box>
              ) : null}

              <Box mt={4} bg={panelBg} borderRadius="2xl" p={4}>
                <Text fontWeight="semibold">
                  {scheduledDue ? `${cadenceLabel(selectedWorkspace.member.reflectionCadence)} is due` : 'No scheduled reflection is due'}
                </Text>
                <Text color={mutedText} mt={2}>
                  {scheduledDue
                    ? 'Create the scheduled reflection now so the member has a current looking-back artifact for this cadence window.'
                    : canManageReflections
                      ? 'If you need an off-cycle check-in, create an impromptu reflection instead.'
                      : 'Reflection creation is limited on this relationship, but history remains visible here.'}
                </Text>
                <HStack mt={4} spacing={3} flexWrap="wrap">
                  {canManageReflections ? (
                    <Button
                      as={RouterLink}
                      to={reflectionPath}
                      colorScheme={scheduledDue ? 'leaf' : 'clay'}
                      aria-label={`Open reflection for ${selectedWorkspace.member.name}`}
                    >
                      Open Reflection
                    </Button>
                  ) : (
                    <Badge borderRadius="full" px={3} py={1}>
                      Observation only
                    </Badge>
                  )}
                </HStack>
              </Box>
            </Box>

            <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <AccountabilitySummaryBlock
                summary={buildAccountabilitySummary(selectedWorkspace.items)}
                mutedText={mutedText}
                subtleText={subtleText}
                scopeLabel="Visible items only."
              />
              <Box mt={3}>
                <PrivacyDisclosure
                  hiddenItemCount={selectedWorkspace.relationship.hiddenItemCount}
                  hiddenItemVisibility={selectedWorkspace.relationship.hiddenItemVisibility}
                  historyWindow={selectedWorkspace.relationship.historyWindow}
                  mutedText={mutedText}
                  subtleText={subtleText}
                />
              </Box>
            </Box>

            <Grid templateColumns={{ base: '1fr', xl: '1.08fr 0.92fr' }} gap={4}>
              <OccurrenceReviewSection
                title="Needs review now"
                count={nowItems.length}
                items={nowItems}
                panelBg={panelBg}
                panelBgStrong={panelBgStrong}
                panelBorder={panelBorder}
                statGlow={statGlow}
                subtleText={subtleText}
                mutedText={mutedText}
                noteDrafts={noteDrafts}
                onNoteDraftChange={setNoteDrafts}
                busyKey={busyKey}
                memberId={selectedWorkspace.member.id}
                canActOnItems={canActOnItems}
                onSubmitAction={submitOccurrenceAction}
                emptyText={
                  selectedWorkspace.items.length === 0
                    ? 'No visible tracked items are in this relationship yet.'
                    : 'No visible occurrences need action right now.'
                }
              />

              <Box bg={panelBgStrong} borderRadius="3xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
                <Heading size="sm" mb={3}>
                  Recent notes and activity
                </Heading>
                <Stack spacing={3}>
                  {recentContext.map((entry) => (
                    <Box key={entry.id} borderRadius="xl" border="1px solid" borderColor={panelBorder} p={3} bg={panelBg}>
                      <HStack spacing={2} flexWrap="wrap" mb={2}>
                        <Badge
                          colorScheme={
                            entry.kind === 'complete' ? 'green' : entry.kind === 'skip' ? 'orange' : 'purple'
                          }
                          borderRadius="full"
                          px={3}
                          py={1}
                        >
                          {entry.kind === 'complete'
                            ? 'Completed'
                            : entry.kind === 'skip'
                              ? 'Skipped'
                              : 'Note added'}
                        </Badge>
                        <Text fontSize="sm" color={subtleText}>
                          {new Date(entry.occurredAt).toLocaleString()}
                        </Text>
                      </HStack>
                      <Text fontWeight="semibold">{entry.itemTitle}</Text>
                      <Text fontSize="sm" color={mutedText} mt={1}>
                        {entry.actorName ? `${entry.actorName} recorded this update.` : 'A visible update was recorded.'}
                      </Text>
                      <Text fontSize="sm" color={subtleText} mt={1}>
                        {entry.note?.trim() ? entry.note : 'No note was added.'}
                      </Text>
                    </Box>
                  ))}
                  {recentContext.length === 0 ? (
                    <Text color={mutedText}>No recent completions, skips, or notes are visible yet.</Text>
                  ) : null}
                </Stack>
              </Box>

              <OccurrenceReviewSection
                title="Upcoming visible work"
                count={upcomingItems.length}
                items={upcomingItems}
                panelBg={panelBg}
                panelBgStrong={panelBgStrong}
                panelBorder={panelBorder}
                statGlow={statGlow}
                subtleText={subtleText}
                mutedText={mutedText}
                noteDrafts={noteDrafts}
                onNoteDraftChange={setNoteDrafts}
                busyKey={busyKey}
                memberId={selectedWorkspace.member.id}
                canActOnItems={canActOnItems}
                onSubmitAction={submitOccurrenceAction}
                emptyText={
                  selectedWorkspace.items.length === 0
                    ? 'No visible future work is in this relationship yet.'
                    : 'No visible upcoming occurrences are queued yet.'
                }
              />

              <Box bg={panelBgStrong} borderRadius="3xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
                <Heading size="sm" mb={3}>
                  Accountability context
                </Heading>
                <Stack spacing={3}>
                  <Box borderRadius="xl" border="1px solid" borderColor={panelBorder} p={3} bg={panelBg}>
                    <Text fontWeight="semibold">Visible urgency</Text>
                    <Text fontSize="sm" color={mutedText} mt={1}>
                      {nowItems.length > 0
                        ? `${nowItems.length} visible occurrence${nowItems.length === 1 ? '' : 's'} need attention now.`
                        : 'No visible due work is waiting right now.'}
                    </Text>
                  </Box>
                  <Box borderRadius="xl" border="1px solid" borderColor={panelBorder} p={3} bg={panelBg}>
                    <Text fontWeight="semibold">Upcoming support window</Text>
                    <Text fontSize="sm" color={mutedText} mt={1}>
                      {upcomingItems.length > 0
                        ? `${upcomingItems.length} upcoming visible occurrence${upcomingItems.length === 1 ? '' : 's'} are next in line for review.`
                        : 'Upcoming visible work will appear here as the next occurrences approach.'}
                    </Text>
                  </Box>
                  <Box borderRadius="xl" border="1px solid" borderColor={panelBorder} p={3} bg={panelBg}>
                    <Text fontWeight="semibold">Latest reflection</Text>
                    <Text fontSize="sm" color={mutedText} mt={1}>
                      {latestReflection
                        ? `${latestReflection.title} is the current looking-back artifact for this member.`
                        : 'No reflection artifact is visible for this member yet.'}
                    </Text>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          </Stack>
        </GridItem>
      </Grid>
    </Stack>
  );
}

function formatRange(periodStart: string, periodEnd: string) {
  const start = new Date(periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${start} to ${end}`;
}

function OccurrenceReviewSection({
  title,
  count,
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
  memberId,
  canActOnItems,
  onSubmitAction,
}: {
  title: string;
  count: number;
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
  memberId: string;
  canActOnItems: boolean;
  onSubmitAction: (entry: ActionableItem, kind: OccurrenceActionKind) => Promise<void>;
}) {
  return (
    <Box bg={panelBgStrong} borderRadius="3xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
      <HStack justify="space-between" align="center" mb={4}>
        <Heading size="sm">{title}</Heading>
        <Badge colorScheme={count > 0 ? 'orange' : 'gray'} borderRadius="full" px={3} py={1}>
          {count}
        </Badge>
      </HStack>
      <Stack spacing={3}>
        {items.map((entry) => {
          const noteDetails = summarizeOccurrenceNoteDetails(entry.item, entry.action.occurrenceAt);
          const noteKey = `${memberId}:${entry.item.id}`;
          const draft = noteDrafts[noteKey] ?? noteDetails?.note ?? '';

          return (
            <Box key={`${entry.item.id}-${entry.action.occurrenceAt ?? entry.action.status}`} borderRadius="2xl" border="1px solid" borderColor={panelBorder} p={4} bg={panelBg}>
              <HStack spacing={2} flexWrap="wrap" mb={2}>
                <Badge
                  colorScheme={
                    entry.action.status === 'Overdue'
                      ? 'red'
                      : entry.action.bucket === 'due'
                        ? 'orange'
                        : 'green'
                  }
                  borderRadius="full"
                  px={3}
                  py={1}
                >
                  {entry.action.status}
                </Badge>
                <Badge variant="subtle" borderRadius="full" px={3} py={1}>
                  {getCategoryLabel(entry.item.category)}
                </Badge>
              </HStack>
              <Text fontWeight="semibold">{entry.item.title}</Text>
              <Text fontSize="sm" color={mutedText} mt={1}>
                {entry.action.detail}
              </Text>
              <Text fontSize="sm" color={subtleText} mt={2}>
                {summarizeSchedule(entry.item)}
              </Text>
              {noteDetails ? (
                <Box mt={3} borderRadius="xl" px={3} py={2} bg={panelBgStrong}>
                  <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.12em" color={subtleText}>
                    Current note{noteDetails.actorName ? ` · ${noteDetails.actorName}` : ''}
                  </Text>
                  <Text mt={1} fontSize="sm">
                    {noteDetails.note}
                  </Text>
                </Box>
              ) : null}
              {canActOnItems ? (
                <Stack spacing={3} mt={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      Support note
                    </Text>
                    <Textarea
                      value={draft}
                      onChange={(event) =>
                        onNoteDraftChange((current) => ({
                          ...current,
                          [noteKey]: event.target.value,
                        }))
                      }
                      placeholder="Add context, obstacles, or what changed."
                      aria-label={`Support note for ${entry.item.title}`}
                      rows={3}
                      resize="vertical"
                    />
                  </Box>
                  <HStack spacing={3} flexWrap="wrap">
                    <Button
                      colorScheme="leaf"
                      size="sm"
                      onClick={() => onSubmitAction(entry, 'complete')}
                      isLoading={busyKey === `${memberId}:${entry.item.id}:complete`}
                      isDisabled={!entry.action.occurrenceAt}
                      aria-label={`Complete ${entry.item.title} for ${memberId}`}
                    >
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSubmitAction(entry, 'skip')}
                      isLoading={busyKey === `${memberId}:${entry.item.id}:skip`}
                      isDisabled={!entry.action.occurrenceAt}
                      aria-label={`Skip ${entry.item.title} for ${memberId}`}
                    >
                      Skip
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSubmitAction(entry, 'note')}
                      isLoading={busyKey === `${memberId}:${entry.item.id}:note`}
                      isDisabled={!entry.action.occurrenceAt}
                      aria-label={`Save note for ${entry.item.title} for ${memberId}`}
                    >
                      Save note
                    </Button>
                  </HStack>
                  <Text fontSize="sm" color={subtleText}>
                    Support actions stay attributed in this member view and in audit history.
                  </Text>
                </Stack>
              ) : (
                <Box mt={4} borderRadius="xl" px={3} py={3} bg={panelBgStrong}>
                  <Text fontSize="sm" fontWeight="medium">
                    Observation only
                  </Text>
                  <Text fontSize="sm" color={mutedText} mt={1}>
                    This relationship can review context here, but it cannot act on occurrences.
                  </Text>
                </Box>
              )}
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
