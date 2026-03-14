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
import { getCategoryLabel } from '../scheduleUtils';
import type { RevieweePortfolio } from '../appTypes';

export function RevieweesPage({
  canReviewOthers,
  revieweePortfolios,
  modeGradient,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBg,
}: {
  canReviewOthers: boolean;
  revieweePortfolios: RevieweePortfolio[];
  modeGradient: string;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBg: string;
}) {
  if (!canReviewOthers) {
    return (
      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Heading size="md">No reviewees yet</Heading>
        <Text mt={3} color={mutedText} maxW="38rem">
          This workspace appears when someone is connected to you as a reviewee. Use Profile & Relationships to
          send an invite or set up the relationship first.
        </Text>
        <Button as={RouterLink} to="/profile" mt={5} colorScheme="leaf" size="sm">
          Open Profile & Relationships
        </Button>
      </Box>
    );
  }

  const firstAttention = revieweePortfolios[0] ?? null;

  return (
    <Stack spacing={5}>
      <Grid templateColumns={{ base: '1fr', xl: '1.08fr 0.92fr' }} gap={5}>
        <GridItem>
          <Box bgGradient={modeGradient} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
              Guide Focus
            </Text>
            <Heading size="lg" mt={2}>
              {firstAttention
                ? `Start with ${firstAttention.reviewee.name}`
                : 'Reviewees will appear here as activity starts to flow'}
            </Heading>
            <Text mt={3} maxW="38rem" color={mutedText}>
              {firstAttention?.nextUrgent
                ? `${firstAttention.reviewee.name} has the highest urgency right now: ${firstAttention.nextUrgent.action.detail}`
                : 'You can still review relationship visibility here before there is enough routine activity to rank people by urgency.'}
            </Text>
            <HStack mt={5} spacing={3} flexWrap="wrap">
              <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                Ordered by urgency first
              </Badge>
              <Badge colorScheme="green" borderRadius="full" px={3} py={1}>
                Passive guides stay observation-only
              </Badge>
            </HStack>
          </Box>
        </GridItem>

        <GridItem>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 1 }} spacing={4}>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>People you guide</StatLabel>
              <StatNumber>{revieweePortfolios.length}</StatNumber>
            </Stat>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>Overdue signals</StatLabel>
              <StatNumber>{revieweePortfolios.reduce((total, entry) => total + entry.overdue.length, 0)}</StatNumber>
            </Stat>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>Recent completions</StatLabel>
              <StatNumber>{revieweePortfolios.reduce((total, entry) => total + entry.recentActivity.length, 0)}</StatNumber>
            </Stat>
          </SimpleGrid>
        </GridItem>
      </Grid>

      <Stack spacing={4}>
        {revieweePortfolios.map((workspace, index) => (
          <Box key={workspace.reviewee.id} bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Flex justify="space-between" align={{ base: 'start', lg: 'center' }} direction={{ base: 'column', lg: 'row' }} gap={4} mb={5}>
              <Box>
                <HStack spacing={3} flexWrap="wrap">
                  <Heading size="md">{workspace.reviewee.name}</Heading>
                  {index === 0 && (
                    <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                      Needs attention first
                    </Badge>
                  )}
                  <Badge
                    colorScheme={workspace.relationship.mode === 'active' ? 'green' : 'gray'}
                    borderRadius="full"
                    px={3}
                    py={1}
                  >
                    {workspace.relationship.mode === 'active' ? 'Active guide' : 'Passive guide'}
                  </Badge>
                </HStack>
                <Text color={mutedText} mt={2}>
                  {workspace.reviewee.email}
                </Text>
                <Text color={mutedText} fontSize="sm" mt={1}>
                  Visibility: {workspace.relationship.historyWindow}. Hidden items stay private and are not shown here.
                </Text>
              </Box>
              {workspace.relationship.canActOnItems || workspace.relationship.canManageRoutines ? (
                <HStack spacing={3}>
                  {workspace.relationship.canActOnItems && <Button size="sm" colorScheme="leaf">Add note</Button>}
                  {workspace.relationship.canManageRoutines && <Button size="sm" variant="outline">Manage routines</Button>}
                </HStack>
              ) : (
                <Badge borderRadius="full" px={3} py={1}>
                  Observation only
                </Badge>
              )}
            </Flex>

            <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={3}>
              <MetricCard title="Overdue" value={workspace.overdue.length} detail={workspace.overdue[0]?.item.title ?? 'No overdue items visible'} mutedText={mutedText} subtleText={subtleText} panelBg={panelBg} />
              <MetricCard title="Missed" value={workspace.missedCount} detail="Miss thresholds are not configured yet" mutedText={mutedText} subtleText={subtleText} panelBg={panelBg} />
              <MetricCard title="Upcoming" value={workspace.upcoming.length} detail={workspace.upcoming[0]?.action.detail ?? 'No upcoming items shared yet'} mutedText={mutedText} subtleText={subtleText} panelBg={panelBg} />
              <MetricCard
                title="Recent activity"
                value={workspace.recentActivity.length}
                detail={
                  workspace.recentActivity[0]
                    ? `${workspace.recentActivity[0].itemTitle} on ${new Date(workspace.recentActivity[0].occurredAt).toLocaleDateString()}`
                    : 'No recent completions visible yet'
                }
                mutedText={mutedText}
                subtleText={subtleText}
                panelBg={panelBg}
              />
            </SimpleGrid>

            <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={4} mt={5}>
              <Box bg={panelBg} borderRadius="2xl" p={4}>
                <Heading size="sm" mb={3}>
                  Urgent and upcoming
                </Heading>
                <Stack spacing={3}>
                  {workspace.actionable.slice(0, 4).map(({ item, action }) => (
                    <Box key={item.id} borderRadius="xl" border="1px solid" borderColor={panelBorder} p={3}>
                      <HStack spacing={2} flexWrap="wrap" mb={2}>
                        <Badge colorScheme={action.status === 'Overdue' ? 'red' : action.bucket === 'due' ? 'orange' : 'green'} borderRadius="full" px={3} py={1}>
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
                  {workspace.actionable.length === 0 && (
                    <Text color={mutedText}>
                      No routines are visible yet. Ask this member to create a routine or wait for the first shared item.
                    </Text>
                  )}
                </Stack>
              </Box>

              <Box bg={panelBg} borderRadius="2xl" p={4}>
                <Heading size="sm" mb={3}>
                  Recent context
                </Heading>
                <Stack spacing={3}>
                  {workspace.recentActivity.map((entry) => (
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
                  {workspace.recentActivity.length === 0 && (
                    <Text color={mutedText}>
                      No recent completions or notes are visible yet. Use this space to monitor when activity starts to pick up.
                    </Text>
                  )}
                </Stack>
              </Box>
            </Grid>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

function MetricCard({
  title,
  value,
  detail,
  mutedText,
  subtleText,
  panelBg,
}: {
  title: string;
  value: number;
  detail: string;
  mutedText: string;
  subtleText: string;
  panelBg: string;
}) {
  return (
    <Box bg={panelBg} borderRadius="2xl" p={4}>
      <Text fontSize="sm" color={mutedText}>
        {title}
      </Text>
      <Text fontSize="2xl" fontWeight="bold">
        {value}
      </Text>
      <Text fontSize="sm" color={subtleText}>
        {detail}
      </Text>
    </Box>
  );
}
