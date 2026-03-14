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
import { Link as RouterLink } from 'react-router-dom';
import { getCategoryLabel, summarizeSchedule } from '../scheduleUtils';
import type { ActionableItem, Item, RevieweePortfolio, User } from '../appTypes';

export function DashboardPage({
  items,
  actionableItems,
  dueItems,
  upcomingItems,
  laterItems,
  projectedWeekChecks,
  relationshipsCount,
  digestSummary,
  categoryBreakdown,
  user,
  canReviewOthers,
  revieweePortfolios,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBg,
  modeGradient,
}: {
  items: Item[];
  actionableItems: ActionableItem[];
  dueItems: ActionableItem[];
  upcomingItems: ActionableItem[];
  laterItems: ActionableItem[];
  projectedWeekChecks: number;
  relationshipsCount: number;
  digestSummary: string;
  categoryBreakdown: Array<{ label: string; count: number }>;
  user: User;
  canReviewOthers: boolean;
  revieweePortfolios: RevieweePortfolio[];
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBg: string;
  modeGradient: string;
}) {
  const topMemberItems = dueItems.length > 0 ? dueItems.slice(0, 3) : actionableItems.slice(0, 3);
  const topReviewees = revieweePortfolios.slice(0, 3);
  const recentGuideActivity = revieweePortfolios.flatMap((entry) =>
    entry.recentActivity.map((activity) => ({ ...activity, revieweeName: entry.reviewee.name })),
  );
  const firstReviewee = revieweePortfolios[0] ?? null;
  const totalGuideUrgency = revieweePortfolios.reduce(
    (total, entry) => total + entry.overdue.length + entry.dueToday.length,
    0,
  );

  const hero = buildHero({
    itemCount: items.length,
    dueCount: dueItems.length,
    upcomingCount: upcomingItems.length,
    canReviewOthers,
    revieweePortfolios,
    digestSummary,
  });

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
        <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
          Attention Now
        </Text>
        <Heading size="lg" mt={2}>
          {hero.title}
        </Heading>
        <Text mt={3} maxW="40rem" color={mutedText}>
          {hero.body}
        </Text>
        <HStack mt={5} spacing={3} flexWrap="wrap">
          <Button as={RouterLink} to={hero.primaryTo} colorScheme="leaf" size="sm">
            {hero.primaryLabel}
          </Button>
          {hero.secondaryTo && hero.secondaryLabel ? (
            <Button as={RouterLink} to={hero.secondaryTo} variant="outline" size="sm">
              {hero.secondaryLabel}
            </Button>
          ) : null}
        </HStack>
      </Box>

      <Grid templateColumns={{ base: '1fr', xl: 'repeat(3, 1fr)' }} gap={5}>
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
            <SectionHeader
              title="Member Actions"
              badge={dueItems.length > 0 ? `${dueItems.length} due now` : `${topMemberItems.length} next up`}
            />
            <Text color={mutedText} fontSize="sm" mb={4}>
              {items.length === 0
                ? 'Create routines first so your dashboard can highlight what needs action.'
                : dueItems.length > 0
                  ? 'Start here before reviewing anything else.'
                  : 'Nothing is urgent right now, so this is the next member work to review.'}
            </Text>
            <Stack spacing={3}>
              {topMemberItems.map(({ item, action }) => (
                <ActionCard
                  key={item.id}
                  title={item.title}
                  status={action.status}
                  detail={action.detail}
                  meta={summarizeSchedule(item)}
                  accent={action.status === 'Overdue' ? 'red' : action.bucket === 'due' ? 'orange' : 'green'}
                  category={getCategoryLabel(item.category)}
                  panelBg={panelBg}
                  panelBorder={panelBorder}
                  mutedText={mutedText}
                  subtleText={subtleText}
                />
              ))}
              {items.length === 0 && (
                <EmptyCard
                  title="No routines yet"
                  body="Open Routines to add your first recurring action."
                  panelBg={panelBg}
                  mutedText={mutedText}
                />
              )}
            </Stack>
            <Button as={RouterLink} to="/my-items" mt={5} size="sm" variant="outline">
              Open My Items
            </Button>
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
            <SectionHeader
              title="Guide Attention"
              badge={canReviewOthers ? `${totalGuideUrgency} urgent signals` : 'Not guiding anyone yet'}
            />
            <Text color={mutedText} fontSize="sm" mb={4}>
              {canReviewOthers
                ? 'Reviewees are ordered by urgency so the first card is the best place to start.'
                : 'This becomes your guide workspace after someone is connected to you as a reviewee.'}
            </Text>
            <Stack spacing={3}>
              {topReviewees.map((entry, index) => (
                <Box key={entry.reviewee.id} bg={panelBg} borderRadius="2xl" p={4}>
                  <HStack justify="space-between" align="start" spacing={3}>
                    <Box>
                      <HStack spacing={2} mb={2} flexWrap="wrap">
                        {index === 0 ? (
                          <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                            Needs attention first
                          </Badge>
                        ) : null}
                        <Badge
                          colorScheme={entry.relationship.mode === 'active' ? 'green' : 'gray'}
                          borderRadius="full"
                          px={3}
                          py={1}
                        >
                          {entry.relationship.mode === 'active' ? 'Active guide' : 'Passive guide'}
                        </Badge>
                      </HStack>
                      <Text fontWeight="semibold">{entry.reviewee.name}</Text>
                      <Text fontSize="sm" color={mutedText} mt={1}>
                        {entry.nextUrgent
                          ? entry.nextUrgent.action.detail
                          : 'No visible routine urgency yet.'}
                      </Text>
                      <Text fontSize="sm" color={subtleText} mt={2}>
                        {entry.recentActivity[0]
                          ? `Recent completion: ${entry.recentActivity[0].itemTitle}`
                          : `Visibility: ${entry.relationship.historyWindow}`}
                      </Text>
                    </Box>
                    <Badge borderRadius="full" px={3} py={1}>
                      {entry.overdue.length + entry.dueToday.length}
                    </Badge>
                  </HStack>
                </Box>
              ))}
              {!canReviewOthers && (
                <EmptyCard
                  title="No reviewees yet"
                  body="Open Profile & Relationships to invite someone or set up a relationship."
                  panelBg={panelBg}
                  mutedText={mutedText}
                />
              )}
            </Stack>
            <Button as={RouterLink} to={canReviewOthers ? '/reviewees' : '/profile'} mt={5} size="sm" variant="outline">
              {canReviewOthers ? 'Open Reviewees' : 'Open Profile & Relationships'}
            </Button>
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
            <SectionHeader title="Next Review" badge={digestSummary} />
            <Text color={mutedText} fontSize="sm" mb={4}>
              Keep your next review moment visible so relationship and digest expectations stay predictable.
            </Text>
            <Stack spacing={3}>
              <KeyValueCard
                label="Weekly digest"
                value={digestSummary}
                detail="This is when your summary review is scheduled."
                panelBg={panelBg}
                mutedText={mutedText}
                subtleText={subtleText}
              />
              <KeyValueCard
                label="Your reviewers"
                value={String(user.reviewers.length)}
                detail={
                  user.reviewers.length > 0
                    ? `${user.reviewers.length} people can review your progress.`
                    : 'No reviewers are connected yet.'
                }
                panelBg={panelBg}
                mutedText={mutedText}
                subtleText={subtleText}
              />
              <KeyValueCard
                label="People you guide"
                value={String(user.reviewTargets.length)}
                detail={
                  user.reviewTargets.length > 0
                    ? `${user.reviewTargets.length} relationships need clear review timing.`
                    : 'You are not guiding anyone yet.'
                }
                panelBg={panelBg}
                mutedText={mutedText}
                subtleText={subtleText}
              />
            </Stack>
            <Button as={RouterLink} to="/profile" mt={5} size="sm" variant="outline">
              Open Profile & Relationships
            </Button>
          </Box>
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', xl: '1.1fr 0.9fr' }} gap={5}>
        <GridItem>
          <Box
            bg={panelBgStrong}
            borderRadius="3xl"
            p={6}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
          >
            <SectionHeader title="Recent Shared Completions" badge={`${recentGuideActivity.length} visible`} />
            <Stack spacing={3} mt={4}>
              {recentGuideActivity.slice(0, 4).map((entry) => (
                <Box key={entry.id} bg={panelBg} borderRadius="2xl" p={4}>
                  <Text fontWeight="semibold">{entry.itemTitle}</Text>
                  <Text color={mutedText} fontSize="sm" mt={1}>
                    {entry.revieweeName} completed this on {new Date(entry.occurredAt).toLocaleString()}.
                  </Text>
                  <Text color={subtleText} fontSize="sm" mt={2}>
                    {entry.note?.trim() ? entry.note : 'No note was added.'}
                  </Text>
                </Box>
              ))}
              {recentGuideActivity.length === 0 && (
                <EmptyCard
                  title="No shared completions yet"
                  body={
                    canReviewOthers
                      ? 'Shared activity will appear here as your reviewees complete visible routines.'
                      : 'Recent shared completions appear here when you are guiding someone.'
                  }
                  panelBg={panelBg}
                  mutedText={mutedText}
                />
              )}
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Stack spacing={5}>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 1 }} spacing={4}>
              <MetricStat
                label="Urgent member work"
                value={dueItems.length}
                panelBgStrong={panelBgStrong}
                panelBorder={panelBorder}
                statGlow={statGlow}
                subtleText={subtleText}
              />
              <MetricStat
                label="Upcoming member work"
                value={upcomingItems.length}
                panelBgStrong={panelBgStrong}
                panelBorder={panelBorder}
                statGlow={statGlow}
                subtleText={subtleText}
              />
              <MetricStat
                label="Scheduled touches this week"
                value={projectedWeekChecks}
                panelBgStrong={panelBgStrong}
                panelBorder={panelBorder}
                statGlow={statGlow}
                subtleText={subtleText}
              />
              <MetricStat
                label="People connected"
                value={relationshipsCount}
                panelBgStrong={panelBgStrong}
                panelBorder={panelBorder}
                statGlow={statGlow}
                subtleText={subtleText}
              />
            </SimpleGrid>

            <Box
              bg={panelBgStrong}
              borderRadius="3xl"
              p={6}
              border="1px solid"
              borderColor={panelBorder}
              boxShadow={statGlow}
            >
              <SectionHeader title="Routine Mix" badge={`${items.length} total`} />
              <Stack spacing={3} mt={4}>
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
                  <Text color={mutedText}>No routines yet. Add one from Routines.</Text>
                )}
              </Stack>
              <Text color={subtleText} fontSize="sm" mt={4}>
                {laterItems.length > 0
                  ? `${laterItems.length} routine${laterItems.length === 1 ? '' : 's'} are stable enough to review later.`
                  : 'Stable routines will settle here after urgent and upcoming work is accounted for.'}
              </Text>
            </Box>
          </Stack>
        </GridItem>
      </Grid>
    </Stack>
  );
}

function buildHero({
  itemCount,
  dueCount,
  upcomingCount,
  canReviewOthers,
  revieweePortfolios,
  digestSummary,
}: {
  itemCount: number;
  dueCount: number;
  upcomingCount: number;
  canReviewOthers: boolean;
  revieweePortfolios: RevieweePortfolio[];
  digestSummary: string;
}) {
  const firstReviewee = revieweePortfolios[0] ?? null;
  const guideUrgency = revieweePortfolios.reduce((total, entry) => total + entry.overdue.length + entry.dueToday.length, 0);

  if (dueCount > 0 && canReviewOthers && firstReviewee) {
    return {
      title: 'You have both member and guide work to review',
      body: `${dueCount} personal routine${dueCount === 1 ? '' : 's'} need attention now, and ${firstReviewee.reviewee.name} is the first reviewee to check on.`,
      primaryTo: '/my-items',
      primaryLabel: 'Open My Items',
      secondaryTo: '/reviewees',
      secondaryLabel: 'Open Reviewees',
    };
  }

  if (dueCount > 0) {
    return {
      title: 'Handle your member work first',
      body: `${dueCount} routine${dueCount === 1 ? '' : 's'} need attention now on My Items.`,
      primaryTo: '/my-items',
      primaryLabel: 'Open My Items',
      secondaryTo: '/routines',
      secondaryLabel: 'Manage Routines',
    };
  }

  if (canReviewOthers && firstReviewee) {
    return {
      title: `Guide attention starts with ${firstReviewee.reviewee.name}`,
      body:
        guideUrgency > 0
          ? `${guideUrgency} visible guide signal${guideUrgency === 1 ? '' : 's'} need review across your relationships.`
          : 'Nothing is urgent right now, but this reviewee is first in line for your next check-in.',
      primaryTo: '/reviewees',
      primaryLabel: 'Open Reviewees',
      secondaryTo: '/profile',
      secondaryLabel: 'Review relationship settings',
    };
  }

  if (itemCount === 0) {
    return {
      title: 'Create your first routine to make this dashboard useful',
      body: 'Start in Routines, then return here for a clearer member and review rhythm.',
      primaryTo: '/routines',
      primaryLabel: 'Add a Routine',
      secondaryTo: '/profile',
      secondaryLabel: 'Open Profile & Relationships',
    };
  }

  if (upcomingCount > 0) {
    return {
      title: 'Nothing is urgent right now',
      body: `${upcomingCount} routine${upcomingCount === 1 ? '' : 's'} are coming up next, and your digest review is set for ${digestSummary}.`,
      primaryTo: '/my-items',
      primaryLabel: 'Review My Items',
      secondaryTo: '/profile',
      secondaryLabel: 'Manage Digest',
    };
  }

  return {
    title: 'Your next review moment is set',
    body: `Weekly digest review is scheduled for ${digestSummary}. Use this dashboard to keep workload and relationships in view between check-ins.`,
    primaryTo: '/profile',
    primaryLabel: 'Open Profile & Relationships',
    secondaryTo: '/routines',
    secondaryLabel: 'Open Routines',
  };
}

function SectionHeader({ title, badge }: { title: string; badge: string }) {
  return (
    <HStack justify="space-between" align="center" mb={4} spacing={3}>
      <Heading size="md">{title}</Heading>
      <Badge borderRadius="full" px={3} py={1}>
        {badge}
      </Badge>
    </HStack>
  );
}

function ActionCard({
  title,
  status,
  detail,
  meta,
  accent,
  category,
  panelBg,
  panelBorder,
  mutedText,
  subtleText,
}: {
  title: string;
  status: string;
  detail: string;
  meta: string;
  accent: 'red' | 'orange' | 'green';
  category: string;
  panelBg: string;
  panelBorder: string;
  mutedText: string;
  subtleText: string;
}) {
  return (
    <Box bg={panelBg} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
      <HStack spacing={2} mb={2} flexWrap="wrap">
        <Badge colorScheme={accent} borderRadius="full" px={3} py={1}>
          {status}
        </Badge>
        <Badge variant="subtle" colorScheme="green" borderRadius="full" px={3} py={1}>
          {category}
        </Badge>
      </HStack>
      <Text fontWeight="semibold">{title}</Text>
      <Text color={mutedText} fontSize="sm" mt={1}>
        {detail}
      </Text>
      <Text color={subtleText} fontSize="sm" mt={2}>
        {meta}
      </Text>
    </Box>
  );
}

function KeyValueCard({
  label,
  value,
  detail,
  panelBg,
  mutedText,
  subtleText,
}: {
  label: string;
  value: string;
  detail: string;
  panelBg: string;
  mutedText: string;
  subtleText: string;
}) {
  return (
    <Box bg={panelBg} borderRadius="2xl" p={4}>
      <Text fontSize="sm" color={mutedText}>
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="semibold" mt={1}>
        {value}
      </Text>
      <Text fontSize="sm" color={subtleText} mt={2}>
        {detail}
      </Text>
    </Box>
  );
}

function EmptyCard({
  title,
  body,
  panelBg,
  mutedText,
}: {
  title: string;
  body: string;
  panelBg: string;
  mutedText: string;
}) {
  return (
    <Box bg={panelBg} borderRadius="2xl" p={5}>
      <Text fontWeight="semibold">{title}</Text>
      <Text color={mutedText} mt={1}>
        {body}
      </Text>
    </Box>
  );
}

function MetricStat({
  label,
  value,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
}: {
  label: string;
  value: number;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
}) {
  return (
    <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
      <StatLabel color={subtleText}>{label}</StatLabel>
      <StatNumber>{value}</StatNumber>
    </Stat>
  );
}
