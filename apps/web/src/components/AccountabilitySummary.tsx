import { Badge, Box, HStack, Stack, Text } from '@chakra-ui/react';
import type { AccountabilitySummary } from '../accountabilityUtils';

export function AccountabilitySummaryBlock({
  summary,
  mutedText,
  subtleText,
  scopeLabel,
}: {
  summary: AccountabilitySummary;
  mutedText: string;
  subtleText: string;
  scopeLabel?: string;
}) {
  return (
    <Stack spacing={2.5}>
      <HStack spacing={2} flexWrap="wrap">
        <Badge colorScheme={statusColor(summary.label)} borderRadius="full" px={3} py={1}>
          {summary.label}
        </Badge>
        <Badge borderRadius="full" px={3} py={1}>
          {summary.score === null ? 'No score yet' : `${summary.score}% accountability`}
        </Badge>
        <Badge colorScheme={trendColor(summary.trendLabel)} borderRadius="full" px={3} py={1}>
          {summary.trendLabel}
        </Badge>
      </HStack>
      <Text color={mutedText} fontSize="sm">
        {summary.detail}
      </Text>
      <Text color={subtleText} fontSize="sm">
        {scopeLabel ? `${scopeLabel} ` : ''}
        {summary.supportText}
      </Text>
    </Stack>
  );
}

export function PrivacyDisclosure({
  hidden,
  historyWindow,
  mutedText,
  subtleText,
}: {
  hidden: boolean;
  historyWindow: string;
  mutedText: string;
  subtleText: string;
}) {
  return (
    <Box borderRadius="2xl" px={4} py={3} bg="blackAlpha.50">
      <Text fontSize="sm" fontWeight="semibold" color={mutedText}>
        {hidden ? 'Some items are hidden from this view.' : 'This score only reflects items shared in this relationship.'}
      </Text>
      <Text fontSize="sm" color={subtleText} mt={1}>
        Visible status and scoring are limited to {historyWindow}. Hidden item names, categories, and totals stay private.
      </Text>
    </Box>
  );
}

function statusColor(label: AccountabilitySummary['label']) {
  if (label === 'On track') return 'green';
  if (label === 'Steady' || label === 'Monitoring') return 'blue';
  if (label === 'Needs attention') return 'orange';
  if (label === 'Off track') return 'red';
  return 'gray';
}

function trendColor(label: AccountabilitySummary['trendLabel']) {
  if (label === 'Improving') return 'green';
  if (label === 'Falling') return 'red';
  if (label === 'Holding steady') return 'blue';
  return 'gray';
}
