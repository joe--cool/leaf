import {
  Badge,
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  SimpleGrid,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Text,
} from '@chakra-ui/react';
import type { ReactNode } from 'react';
import type { RetrospectiveEntry } from '../appTypes';

export function RetrospectivesPage({
  entries,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBg,
  modeGradient,
}: {
  entries: RetrospectiveEntry[];
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
        <Heading size="md">No retrospectives yet</Heading>
        <Text mt={3} color={mutedText} maxW="40rem">
          Retrospectives appear when a reflection window has real content such as completions, routine changes, or
          relationship activity. Empty periods stay out of the history.
        </Text>
      </Box>
    );
  }

  const current = entries[0]!;
  const distinctSubjects = new Set(entries.map((entry) => entry.subjectName)).size;
  const scoreCount = entries.filter((entry) => entry.accountabilityScore !== null).length;

  return (
    <Stack spacing={5}>
      <Grid templateColumns={{ base: '1fr', xl: '1.1fr 0.9fr' }} gap={5}>
        <GridItem>
          <Box bgGradient={modeGradient} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
              Reflection History
            </Text>
            <Heading size="lg" mt={2}>
              {current.title}
            </Heading>
            <Text mt={3} maxW="42rem" color={mutedText}>
              Retrospectives are reflective summaries, not raw logs. Each card rolls up accountability movement,
              highlights what changed, and keeps relationship visibility explicit.
            </Text>
            <Box mt={5} bg={panelBg} borderRadius="2xl" p={4}>
              <Text fontSize="sm" color={subtleText}>
                Latest audience
              </Text>
              <Text mt={1} fontWeight="semibold">
                {current.audience}
              </Text>
              <Text mt={2} fontSize="sm" color={mutedText}>
                {current.visibility}
              </Text>
            </Box>
          </Box>
        </GridItem>

        <GridItem>
          <SimpleGrid columns={{ base: 1, md: 3, xl: 1 }} spacing={4}>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>Reflection windows</StatLabel>
              <StatNumber>{entries.length}</StatNumber>
            </Stat>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>People represented</StatLabel>
              <StatNumber>{distinctSubjects}</StatNumber>
            </Stat>
            <Stat bg={panelBgStrong} borderRadius="2xl" p={5} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
              <StatLabel color={subtleText}>Scored reviews</StatLabel>
              <StatNumber>{scoreCount}</StatNumber>
            </Stat>
          </SimpleGrid>
        </GridItem>
      </Grid>

      <Stack spacing={4}>
        {entries.map((entry) => (
          <Box key={entry.id} bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Flex justify="space-between" align={{ base: 'start', lg: 'center' }} direction={{ base: 'column', lg: 'row' }} gap={4}>
              <Box>
                <HStackWrap>
                  <Badge colorScheme="leaf" borderRadius="full" px={3} py={1}>
                    {entry.accountabilityLabel}
                  </Badge>
                  <Badge variant="subtle" borderRadius="full" px={3} py={1}>
                    {entry.subjectName}
                  </Badge>
                  <Badge variant="outline" borderRadius="full" px={3} py={1}>
                    {formatRange(entry.periodStart, entry.periodEnd)}
                  </Badge>
                </HStackWrap>
                <Heading size="md" mt={3}>
                  {entry.title}
                </Heading>
                <Text mt={2} color={mutedText}>
                  {entry.summary}
                </Text>
              </Box>
              <Box minW={{ lg: '220px' }} bg={panelBg} borderRadius="2xl" p={4}>
                <Text fontSize="sm" color={subtleText}>
                  Accountability
                </Text>
                <Text mt={1} fontSize="2xl" fontWeight="bold">
                  {entry.accountabilityScore === null ? 'Building' : `${entry.accountabilityScore}%`}
                </Text>
                <Text fontSize="sm" color={mutedText} mt={1}>
                  {entry.trendLabel}
                  {entry.trendDelta === null ? '' : ` · ${entry.trendDelta > 0 ? '+' : ''}${entry.trendDelta}`}
                </Text>
              </Box>
            </Flex>

            <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={4} mt={5}>
              <Box bg={panelBg} borderRadius="2xl" p={4}>
                <Heading size="sm" mb={3}>
                  Highlights
                </Heading>
                <Stack spacing={3}>
                  {entry.highlights.map((highlight) => (
                    <Text key={highlight} color={mutedText}>
                      {highlight}
                    </Text>
                  ))}
                </Stack>
              </Box>
              <Box bg={panelBg} borderRadius="2xl" p={4}>
                <Heading size="sm" mb={3}>
                  Visibility and audience
                </Heading>
                <Text color={mutedText}>{entry.audience}</Text>
                <Text color={subtleText} mt={3}>
                  {entry.visibility}
                </Text>
              </Box>
            </Grid>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

function HStackWrap({ children }: { children: ReactNode }) {
  return (
    <Flex gap={2} wrap="wrap">
      {children}
    </Flex>
  );
}

function formatRange(periodStart: string, periodEnd: string) {
  const start = new Date(periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${start} to ${end}`;
}
