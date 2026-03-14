import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { buildAccountabilitySummary } from '../accountabilityUtils';
import { AccountabilitySummaryBlock } from '../components/AccountabilitySummary';
import { getCategoryLabel, summarizeSchedule } from '../scheduleUtils';
import type { ActionableItem, Item } from '../appTypes';

export function MyItemsPage({
  items,
  dueItems,
  actionableItems,
  upcomingItems,
  laterItems,
  modeGradient,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBg,
}: {
  items: Item[];
  dueItems: ActionableItem[];
  actionableItems: ActionableItem[];
  upcomingItems: ActionableItem[];
  laterItems: ActionableItem[];
  modeGradient: string;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBg: string;
}) {
  const primaryItems = dueItems.length > 0 ? dueItems : actionableItems.slice(0, 3);
  const secondaryItems = upcomingItems.slice(0, 4);
  const accountability = buildAccountabilitySummary(items);

  return (
    <Grid templateColumns={{ base: '1fr', xl: '1.08fr 0.92fr' }} gap={5}>
      <GridItem>
        <Stack spacing={5}>
          <Box bgGradient={modeGradient} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
              Action Queue
            </Text>
            <Heading size="lg" mt={2}>
              {dueItems.length > 0 ? 'Handle what is due now' : 'Nothing urgent is due right now'}
            </Heading>
            <Text mt={3} maxW="34rem" color={mutedText}>
              {items.length === 0
                ? 'Create routines first, then return here to work through what needs attention.'
                : dueItems.length > 0
                  ? `${dueItems.length} routine${dueItems.length === 1 ? '' : 's'} need attention today.`
                  : 'Use this page to work through today, then glance ahead before the next check-in.'}
            </Text>
            <Box mt={5} borderRadius="2xl" px={4} py={4} bg={panelBg}>
              <AccountabilitySummaryBlock
                summary={accountability}
                mutedText={mutedText}
                subtleText={subtleText}
              />
            </Box>
            <HStack mt={5} spacing={3} flexWrap="wrap">
              <Button as={RouterLink} to="/routines" colorScheme="leaf" size="sm">
                Manage routines
              </Button>
              <Button as={RouterLink} to="/profile" variant="outline" size="sm">
                Open profile & relationships
              </Button>
            </HStack>
          </Box>

          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <HStack justify="space-between" align="center" mb={4}>
              <Heading size="md">{dueItems.length > 0 ? 'Needs attention now' : 'What is next'}</Heading>
              <Badge colorScheme={dueItems.length > 0 ? 'orange' : 'green'} borderRadius="full" px={3} py={1}>
                {primaryItems.length}
              </Badge>
            </HStack>
            <Stack spacing={3}>
              {primaryItems.map(({ item, action }) => (
                <Box key={item.id} border="1px solid" borderColor={panelBorder} borderRadius="2xl" p={4} bg={panelBg}>
                  <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={3} direction={{ base: 'column', md: 'row' }}>
                    <Box>
                      <HStack spacing={2} mb={2} flexWrap="wrap">
                        <Badge colorScheme={action.bucket === 'due' ? 'orange' : 'green'} borderRadius="full" px={3} py={1}>
                          {action.status}
                        </Badge>
                        <Badge variant="subtle" colorScheme="green" borderRadius="full" px={3} py={1}>
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </HStack>
                      <Text fontWeight="semibold">{item.title}</Text>
                      <Text color={mutedText} fontSize="sm" mt={1}>
                        {action.detail}
                      </Text>
                      <Text color={subtleText} fontSize="sm" mt={2}>
                        {summarizeSchedule(item)}
                      </Text>
                    </Box>
                    <Button as={RouterLink} to="/routines" size="sm" variant="outline">
                      Open routine
                    </Button>
                  </Flex>
                </Box>
              ))}
              {items.length === 0 && (
                <Box bg={panelBg} borderRadius="2xl" p={5}>
                  <Text fontWeight="semibold">No items yet</Text>
                  <Text color={mutedText} mt={1}>
                    Create your first routine in Routines to build this action list.
                  </Text>
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>
      </GridItem>

      <GridItem>
        <Stack spacing={5}>
          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={4}>
              Coming up
            </Heading>
            <Stack spacing={3}>
              {secondaryItems.map(({ item, action }) => (
                <Box key={item.id} bg={panelBg} borderRadius="2xl" p={4}>
                  <HStack justify="space-between" align="start">
                    <Box>
                      <Text fontWeight="semibold">{item.title}</Text>
                      <Text color={mutedText} fontSize="sm" mt={1}>
                        {action.detail}
                      </Text>
                    </Box>
                    <Badge colorScheme="green" borderRadius="full" px={3} py={1}>
                      {action.status}
                    </Badge>
                  </HStack>
                </Box>
              ))}
              {secondaryItems.length === 0 && items.length > 0 && (
                <Text color={mutedText}>Nothing upcoming is scheduled beyond the routines already due.</Text>
              )}
              {items.length === 0 && <Text color={mutedText}>No upcoming work yet.</Text>}
            </Stack>
          </Box>

          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={4}>
              Stable routines
            </Heading>
            <Stack spacing={3}>
              {laterItems.slice(0, 4).map(({ item, action }) => (
                <Flex key={item.id} justify="space-between" align="center" bg={panelBg} borderRadius="2xl" px={4} py={3}>
                  <Box>
                    <Text fontWeight="semibold">{item.title}</Text>
                    <Text color={mutedText} fontSize="sm">
                      {action.detail}
                    </Text>
                  </Box>
                  <Badge borderRadius="full" px={3} py={1}>
                    {action.status}
                  </Badge>
                </Flex>
              ))}
              {laterItems.length === 0 && <Text color={mutedText}>All configured routines are already represented above.</Text>}
            </Stack>
            <Text color={subtleText} fontSize="sm" mt={4}>
              Complete improves accountability. Skipped will stay neutral. Missed appears only after miss thresholds are configured.
            </Text>
          </Box>
        </Stack>
      </GridItem>
    </Grid>
  );
}
