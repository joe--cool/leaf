import { Badge, Box, Grid, GridItem, Heading, SimpleGrid, Stack, Stat, StatLabel, StatNumber, Text } from '@chakra-ui/react';
import type { AuditLogEntry } from '../appTypes';

export function AuditLogPage({
  entries,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBg,
  modeGradient,
}: {
  entries: AuditLogEntry[];
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBg: string;
  modeGradient: string;
}) {
  if (entries.length === 0) {
    return (
      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Heading size="md">No audit history yet</Heading>
        <Text mt={3} color={mutedText} maxW="40rem">
          Important account, relationship, and routine changes will appear here with attribution once activity starts.
        </Text>
      </Box>
    );
  }

  const relationshipCount = entries.filter((entry) => entry.category === 'relationship').length;
  const activityCount = entries.filter((entry) => entry.category === 'activity').length;
  const accountCount = entries.filter((entry) => entry.category === 'account' || entry.category === 'invite').length;

  return (
    <Stack spacing={5}>
      <Grid templateColumns={{ base: '1fr', xl: '1.05fr 0.95fr' }} gap={5}>
        <GridItem>
          <Box bgGradient={modeGradient} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
              Transparency Trail
            </Text>
            <Heading size="lg" mt={2}>
              Attributed account and relationship history
            </Heading>
            <Text mt={3} maxW="42rem" color={mutedText}>
              The audit log is event history. It records who acted, what changed, and which visibility boundary makes
              the event relevant to you.
            </Text>
          </Box>
        </GridItem>

        <GridItem>
          <SimpleGrid columns={{ base: 1, md: 3, xl: 1 }} spacing={4}>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>Relationship events</StatLabel>
              <StatNumber>{relationshipCount}</StatNumber>
            </Stat>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>Activity events</StatLabel>
              <StatNumber>{activityCount}</StatNumber>
            </Stat>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>Account events</StatLabel>
              <StatNumber>{accountCount}</StatNumber>
            </Stat>
          </SimpleGrid>
        </GridItem>
      </Grid>

      <Stack spacing={4}>
        {entries.map((entry) => (
          <Box key={entry.id} bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Stack spacing={4}>
              <Stack spacing={2}>
                <Stack direction={{ base: 'column', md: 'row' }} spacing={2} align={{ base: 'start', md: 'center' }}>
                  <Badge colorScheme={badgeScheme(entry.category)} borderRadius="full" px={3} py={1}>
                    {labelForCategory(entry.category)}
                  </Badge>
                  <Badge variant="subtle" borderRadius="full" px={3} py={1}>
                    {entry.subjectName}
                  </Badge>
                  <Text fontSize="sm" color={subtleText}>
                    {new Date(entry.occurredAt).toLocaleString()}
                  </Text>
                </Stack>
                <Heading size="md">{entry.title}</Heading>
                <Text color={mutedText}>{entry.detail}</Text>
              </Stack>

              <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr 1fr' }} gap={3}>
                <Box bg={panelBg} borderRadius="2xl" p={4}>
                  <Text fontSize="sm" color={subtleText}>
                    Actor
                  </Text>
                  <Text mt={1} fontWeight="semibold">
                    {entry.actorName}
                  </Text>
                </Box>
                <Box bg={panelBg} borderRadius="2xl" p={4}>
                  <Text fontSize="sm" color={subtleText}>
                    Scope
                  </Text>
                  <Text mt={1} fontWeight="semibold">
                    {scopeLabel(entry.scope)}
                  </Text>
                </Box>
                <Box bg={panelBg} borderRadius="2xl" p={4}>
                  <Text fontSize="sm" color={subtleText}>
                    Visibility
                  </Text>
                  <Text mt={1} color={mutedText}>
                    {entry.visibility}
                  </Text>
                </Box>
              </Grid>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

function badgeScheme(category: AuditLogEntry['category']) {
  if (category === 'relationship') return 'orange';
  if (category === 'activity') return 'green';
  if (category === 'routine') return 'purple';
  return 'blue';
}

function labelForCategory(category: AuditLogEntry['category']) {
  if (category === 'relationship') return 'Relationship change';
  if (category === 'activity') return 'Accountability activity';
  if (category === 'routine') return 'Routine change';
  if (category === 'invite') return 'Invite';
  return 'Account event';
}

function scopeLabel(scope: AuditLogEntry['scope']) {
  if (scope === 'member') return 'Member visibility';
  if (scope === 'guide') return 'Guide visibility';
  return 'Your account';
}
