import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Text,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { getCategoryLabel, summarizeSchedule } from '../scheduleUtils';
import type { Item, User } from '../appTypes';

export function DashboardPage({
  items,
  projectedWeekChecks,
  relationshipsCount,
  digestSummary,
  categoryBreakdown,
  user,
  dueItemsCount,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBg,
  modeGradient,
}: {
  items: Item[];
  projectedWeekChecks: number;
  relationshipsCount: number;
  digestSummary: string;
  categoryBreakdown: Array<{ label: string; count: number }>;
  user: User;
  dueItemsCount: number;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBg: string;
  modeGradient: string;
}) {
  const nextAction =
    items.length === 0
      ? {
          title: 'Create your first routine',
          body: 'Start in Routines so My Items has something actionable to show.',
          to: '/routines',
          label: 'Add a routine',
        }
      : dueItemsCount > 0
        ? {
            title: 'Handle what is due now',
            body: `${dueItemsCount} routine${dueItemsCount === 1 ? '' : 's'} need attention on My Items.`,
            to: '/my-items',
            label: 'Open My Items',
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
      <SimpleStats
        itemsCount={items.length}
        projectedWeekChecks={projectedWeekChecks}
        relationshipsCount={relationshipsCount}
        panelBgStrong={panelBgStrong}
        panelBorder={panelBorder}
        statGlow={statGlow}
        subtleText={subtleText}
      />

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
                {items.length === 0 && <Text color={mutedText}>No routines yet. Add one from Routines.</Text>}
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
              <Heading size="md" mb={4}>
                Routine Mix
              </Heading>
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
                {categoryBreakdown.length === 0 && <Text color={mutedText}>No routines yet. Add one from Routines.</Text>}
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
                People
              </Heading>
              <Stack spacing={3}>
                <Flex justify="space-between" align="center" bg={panelBg} borderRadius="2xl" px={4} py={3}>
                  <Text color={mutedText}>Reviewers</Text>
                  <Text fontWeight="semibold">{user.reviewers.length}</Text>
                </Flex>
                <Flex justify="space-between" align="center" bg={panelBg} borderRadius="2xl" px={4} py={3}>
                  <Text color={mutedText}>People you review</Text>
                  <Text fontWeight="semibold">{user.reviewTargets.length}</Text>
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
            {user.reviewTargets.slice(0, 4).map((entry) => (
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
            {user.reviewTargets.length === 0 && <Text color={mutedText}>No review assignments yet.</Text>}
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
            {user.reviewers.slice(0, 4).map((entry) => (
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
            {user.reviewers.length === 0 && <Text color={mutedText}>No reviewers connected yet.</Text>}
          </Stack>
        </Box>
      </Grid>
    </Stack>
  );
}

function SimpleStats({
  itemsCount,
  projectedWeekChecks,
  relationshipsCount,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
}: {
  itemsCount: number;
  projectedWeekChecks: number;
  relationshipsCount: number;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
}) {
  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
      <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <StatLabel color={subtleText}>Active tracked items</StatLabel>
        <StatNumber>{itemsCount}</StatNumber>
      </Stat>
      <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <StatLabel color={subtleText}>Scheduled touches this week</StatLabel>
        <StatNumber>{projectedWeekChecks}</StatNumber>
      </Stat>
      <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <StatLabel color={subtleText}>People connected</StatLabel>
        <StatNumber>{relationshipsCount}</StatNumber>
      </Stat>
    </Grid>
  );
}
