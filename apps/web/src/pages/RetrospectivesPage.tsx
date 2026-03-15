import {
  Badge,
  Box,
  Flex,
  FormControl,
  Input,
  FormLabel,
  Grid,
  Heading,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { RetrospectiveEntry, RetrospectiveSubjectOption } from '../appTypes';

export function RetrospectivesPage({
  entries,
  subjects,
  currentUserId,
  initialSubjectId,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBg,
  modeGradient,
}: {
  entries: RetrospectiveEntry[];
  subjects: RetrospectiveSubjectOption[];
  currentUserId: string;
  initialSubjectId?: string;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBg: string;
  modeGradient: string;
}) {
  const [filterSubjectUserId, setFilterSubjectUserId] = useState(initialSubjectId ?? '');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'members'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'scheduled' | 'manual'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (initialSubjectId) setFilterSubjectUserId(initialSubjectId);
  }, [initialSubjectId]);

  const filteredEntries = entries.filter((entry) => {
    if (scopeFilter === 'mine' && entry.subjectUserId !== currentUserId) return false;
    if (scopeFilter === 'members' && entry.subjectUserId === currentUserId) return false;
    if (filterSubjectUserId && entry.subjectUserId !== filterSubjectUserId) return false;
    if (kindFilter !== 'all' && entry.kind !== kindFilter) return false;
    if (!matchesDateRange(entry.periodStart, entry.periodEnd, fromDate, toDate)) return false;
    return true;
  });

  return (
    <Stack spacing={5}>
      <Box bgGradient={modeGradient} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
          Looking Back
        </Text>
        <Heading size="lg" mt={2}>
          Browse reflections, then open one to review or edit it
        </Heading>
        <Text mt={3} maxW="42rem" color={mutedText}>
          Keep this page list-first. Use the filter bar to narrow the history, then open one reflection at a time.
        </Text>
      </Box>

      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(5, minmax(0, 1fr))' }} gap={4}>
          <FormControl>
            <FormLabel>View</FormLabel>
            <Select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as 'all' | 'mine' | 'members')}>
              <option value="all">All visible</option>
              <option value="mine">Mine</option>
              <option value="members">Members</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Filter subject</FormLabel>
            <Select value={filterSubjectUserId} onChange={(event) => setFilterSubjectUserId(event.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.label}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Type</FormLabel>
            <Select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as 'all' | 'scheduled' | 'manual')}>
              <option value="all">All reflections</option>
              <option value="scheduled">Scheduled</option>
              <option value="manual">Impromptu</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>From</FormLabel>
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>To</FormLabel>
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </FormControl>
        </Grid>
      </Box>

      <Box bg={panelBgStrong} borderRadius="3xl" p={4} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="sm">Reflections</Heading>
          <Badge borderRadius="full" px={3} py={1}>
            {filteredEntries.length}
          </Badge>
        </Flex>
        <Stack spacing={0}>
          {filteredEntries.length === 0 ? (
            <Text color={mutedText}>No reflections match the current filters.</Text>
          ) : null}
          {filteredEntries.map((entry, index) => (
            <Box
              key={entry.id}
              as={RouterLink}
              to={`/retrospectives/${entry.id}`}
              display="block"
              bg={panelBg}
              borderRadius="2xl"
              border="1px solid"
              borderColor={panelBorder}
              p={4}
              _hover={{ textDecoration: 'none', borderColor: subtleText }}
              mt={index === 0 ? 0 : 3}
            >
              <Flex justify="space-between" align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={4}>
                <Box minW={0}>
                  <HStackWrap>
                    <Badge colorScheme={entry.kind === 'manual' ? 'orange' : 'leaf'} borderRadius="full" px={3} py={1}>
                      {entry.kind === 'manual' ? 'Impromptu' : 'Scheduled'}
                    </Badge>
                    <Badge variant="subtle" borderRadius="full" px={3} py={1}>
                      {entry.subjectName}
                    </Badge>
                  </HStackWrap>
                  <Text fontWeight="semibold" mt={3}>
                    {entry.title}
                  </Text>
                  <Text fontSize="sm" color={mutedText} mt={1}>
                    {formatRange(entry.periodStart, entry.periodEnd)}
                  </Text>
                  <Text fontSize="sm" color={subtleText} mt={1} noOfLines={2}>
                    {entry.summary?.trim() || 'No summary yet.'}
                  </Text>
                </Box>
                <Text color="clay.600" fontWeight="semibold" whiteSpace="nowrap">
                  Open
                </Text>
              </Flex>
            </Box>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

function HStackWrap({ children }: { children: React.ReactNode }) {
  return (
    <Flex gap={2} wrap="wrap">
      {children}
    </Flex>
  );
}

function formatRange(periodStart: string, periodEnd: string) {
  const start = new Date(periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `${start} to ${end}`;
}

function matchesDateRange(periodStart: string, periodEnd: string, fromDate: string, toDate: string) {
  const rangeStart = parseDateInput(fromDate);
  const rangeEndExclusive = parseDateInput(toDate, 1);
  const entryStart = new Date(periodStart).getTime();
  const entryEnd = new Date(periodEnd).getTime();

  if (rangeStart !== null && entryEnd <= rangeStart) return false;
  if (rangeEndExclusive !== null && entryStart >= rangeEndExclusive) return false;
  return true;
}

function parseDateInput(value: string, addDays = 0) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setDate(parsed.getDate() + addDays);
  return parsed.getTime();
}
