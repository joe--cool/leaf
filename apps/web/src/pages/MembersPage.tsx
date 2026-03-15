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
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { buildAccountabilitySummary } from '../accountabilityUtils';
import { buildReflectionDraftPath, cadenceLabel, scheduledReflectionDue } from '../reflectionUtils';
import { AccountabilitySummaryBlock, PrivacyDisclosure } from '../components/AccountabilitySummary';
import { getCategoryLabel } from '../scheduleUtils';
import type { MemberPortfolio, RetrospectiveEntry } from '../appTypes';

export function MembersPage({
  canReviewOthers,
  memberPortfolios,
  retrospectiveEntries,
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
  modeGradient: string;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBg: string;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(memberPortfolios[0]?.member.id ?? '');

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
  const hasHiddenItems = memberPortfolios.some((entry) => entry.relationship.hiddenItemCount > 0);
  const memberReflections = retrospectiveEntries
    .filter((entry) => entry.subjectUserId === selectedWorkspace.member.id)
    .sort((left, right) => right.periodEnd.localeCompare(left.periodEnd));
  const latestReflection = memberReflections[0] ?? null;
  const latestScheduled = memberReflections.find((entry) => entry.kind === 'scheduled') ?? null;
  const scheduledDue = scheduledReflectionDue(selectedWorkspace.member.reflectionCadence, latestScheduled);
  const canManageReflections = selectedWorkspace.relationship.canManageFollowThrough;
  const reflectionPath = buildReflectionDraftPath({
    id: selectedWorkspace.member.id,
    name: selectedWorkspace.member.name,
    cadence: selectedWorkspace.member.reflectionCadence,
    retrospectives: memberReflections,
  });

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
        hidden={hasHiddenItems}
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
                      {latest ? `Latest: ${latest.title}` : due ? 'Scheduled reflection due' : 'No reflection yet'}
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
                  <Text color={mutedText} fontSize="sm" mt={1}>
                    Visibility: {selectedWorkspace.relationship.historyWindow}.
                  </Text>
                </Box>
                <Button
                  as={RouterLink}
                  to={`/retrospectives?subject=${encodeURIComponent(selectedWorkspace.member.id)}`}
                  variant="outline"
                >
                  Open in Looking Back
                </Button>
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
                    : 'If you need an off-cycle check-in, create an impromptu reflection instead.'}
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
                  hidden={selectedWorkspace.relationship.hiddenItemCount > 0}
                  historyWindow={selectedWorkspace.relationship.historyWindow}
                  mutedText={mutedText}
                  subtleText={subtleText}
                />
              </Box>
            </Box>

            <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={4}>
              <Box bg={panelBgStrong} borderRadius="3xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
                <Heading size="sm" mb={3}>
                  Urgent and upcoming
                </Heading>
                <Stack spacing={3}>
                  {selectedWorkspace.actionable.slice(0, 4).map(({ item, action }) => (
                    <Box key={item.id} borderRadius="xl" border="1px solid" borderColor={panelBorder} p={3}>
                      <HStack spacing={2} flexWrap="wrap" mb={2}>
                        <Badge
                          bg={
                            action.status === 'Overdue'
                              ? 'clay.300'
                              : action.bucket === 'due'
                                ? 'clay.200'
                                : 'leaf.100'
                          }
                          color={
                            action.status === 'Overdue'
                              ? 'clay.900'
                              : action.bucket === 'due'
                                ? 'clay.900'
                                : 'leaf.800'
                          }
                          _dark={{
                            bg:
                              action.status === 'Overdue'
                                ? 'clay.700'
                                : action.bucket === 'due'
                                  ? 'clay.700'
                                  : 'leaf.800',
                            color:
                              action.status === 'Overdue'
                                ? 'clay.50'
                                : action.bucket === 'due'
                                  ? 'clay.50'
                                  : 'leaf.100',
                          }}
                          borderRadius="full"
                          px={3}
                          py={1}
                        >
                          {action.status}
                        </Badge>
                        <Badge variant="subtle" borderRadius="full" px={3} py={1}>
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </HStack>
                      <Text fontWeight="semibold">{item.title}</Text>
                      <Text fontSize="sm" color={mutedText} mt={1}>
                        {action.detail}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box bg={panelBgStrong} borderRadius="3xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
                <Heading size="sm" mb={3}>
                  Recent context
                </Heading>
                <Stack spacing={3}>
                  {selectedWorkspace.recentActivity.map((entry) => (
                    <Box key={entry.id} borderRadius="xl" border="1px solid" borderColor={panelBorder} p={3}>
                      <Text fontWeight="semibold">{entry.itemTitle}</Text>
                      <Text fontSize="sm" color={mutedText} mt={1}>
                        Completed {new Date(entry.occurredAt).toLocaleString()}
                      </Text>
                      <Text fontSize="sm" color={subtleText} mt={1}>
                        {entry.note?.trim() ? entry.note : 'No note was added.'}
                      </Text>
                    </Box>
                  ))}
                  {selectedWorkspace.recentActivity.length === 0 ? (
                    <Text color={mutedText}>No recent completions or notes are visible yet.</Text>
                  ) : null}
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
