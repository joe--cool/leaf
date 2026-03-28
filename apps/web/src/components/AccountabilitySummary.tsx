import { Badge, Box, HStack, Stack, Text } from '@chakra-ui/react';
import type { HiddenItemVisibility, RelationshipHistoryWindow } from '@leaf/shared';
import type { AccountabilitySummary } from '../accountabilityUtils';
import { hiddenItemsBoundaryText, relationshipHistoryWindowLabel } from '../relationshipUi';

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
        <Badge {...statusBadgeProps(summary.label)} borderRadius="full" px={3} py={1}>
          {summary.label}
        </Badge>
        <Badge borderRadius="full" px={3} py={1}>
          {summary.score === null ? 'No score yet' : `${summary.score}% accountability`}
        </Badge>
        <Badge {...trendBadgeProps(summary.trendLabel)} borderRadius="full" px={3} py={1}>
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
  hiddenItemCount,
  hiddenItemVisibility,
  historyWindow,
  mutedText,
  subtleText,
}: {
  hiddenItemCount: number;
  hiddenItemVisibility: HiddenItemVisibility;
  historyWindow: RelationshipHistoryWindow;
  mutedText: string;
  subtleText: string;
}) {
  return (
    <Box borderRadius="2xl" px={4} py={3} bg="blackAlpha.50">
      <Text fontSize="sm" fontWeight="semibold" color={mutedText}>
        {hiddenItemCount > 0
          ? hiddenItemsBoundaryText(hiddenItemCount, hiddenItemVisibility, 'Some items are hidden from this view.')
          : 'This score only reflects items shared in this relationship.'}
      </Text>
      <Text fontSize="sm" color={subtleText} mt={1}>
        Visible status and scoring are limited to {relationshipHistoryWindowLabel(historyWindow)}. Hidden item names,
        categories, and totals stay private.
      </Text>
    </Box>
  );
}

function statusBadgeProps(label: AccountabilitySummary['label']) {
  if (label === 'On track') return { bg: 'leaf.100', color: 'leaf.800', _dark: { bg: 'leaf.800', color: 'leaf.100' } };
  if (label === 'Steady' || label === 'Monitoring') {
    return { bg: 'clay.100', color: 'clay.800', _dark: { bg: 'clay.800', color: 'clay.100' } };
  }
  if (label === 'Needs attention') {
    return { bg: 'clay.200', color: 'clay.900', _dark: { bg: 'clay.700', color: 'clay.50' } };
  }
  if (label === 'Off track') return { bg: 'blackAlpha.100', color: 'clay.900', _dark: { bg: 'whiteAlpha.160', color: 'clay.50' } };
  return { bg: 'blackAlpha.100', color: 'inherit', _dark: { bg: 'whiteAlpha.160', color: 'inherit' } };
}

function trendBadgeProps(label: AccountabilitySummary['trendLabel']) {
  if (label === 'Improving') return { bg: 'leaf.100', color: 'leaf.800', _dark: { bg: 'leaf.800', color: 'leaf.100' } };
  if (label === 'Falling') return { bg: 'clay.200', color: 'clay.900', _dark: { bg: 'clay.700', color: 'clay.50' } };
  if (label === 'Holding steady') return { bg: 'clay.100', color: 'clay.800', _dark: { bg: 'clay.800', color: 'clay.100' } };
  return { bg: 'blackAlpha.100', color: 'inherit', _dark: { bg: 'whiteAlpha.160', color: 'inherit' } };
}
