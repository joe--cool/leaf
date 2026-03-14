import { Badge, Box, Button, Grid, GridItem, Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import type { AuthNextStep, User } from '../appTypes';

export function WelcomePage({
  user,
  nextStep,
  panelBgStrong,
  panelBorder,
  statGlow,
  mutedText,
  modeGradient,
  isDemoWorkspace,
  onFinish,
}: {
  user: User;
  nextStep: AuthNextStep;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  mutedText: string;
  modeGradient: string;
  isDemoWorkspace: boolean;
  onFinish: () => void;
}) {
  return (
    <Grid templateColumns={{ base: '1fr', xl: '1.1fr 0.9fr' }} gap={5}>
      <GridItem>
        <Box bgGradient={modeGradient} borderRadius="3xl" p={{ base: 6, md: 7 }} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
          <Stack spacing={5}>
            <Badge alignSelf="start" colorScheme="leaf" borderRadius="full" px={3} py={1}>
              Welcome
            </Badge>
            <Box>
              <Heading size="xl">You’re in. Start from the next real action.</Heading>
              <Text mt={3} color={mutedText} maxW="40rem">
                Leaf works best when the first session explains the relationship model, then moves you straight into the
                job your role needs next.
              </Text>
            </Box>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              <Box borderRadius="2xl" bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.100' }} p={4}>
                <Text fontWeight="semibold">Members act</Text>
                <Text mt={2} fontSize="sm" color={mutedText}>
                  Create items, work the queue, and keep notes lightweight.
                </Text>
              </Box>
              <Box borderRadius="2xl" bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.100' }} p={4}>
                <Text fontWeight="semibold">Guides review</Text>
                <Text mt={2} fontSize="sm" color={mutedText}>
                  Visibility and controls depend on the relationship that was agreed to.
                </Text>
              </Box>
              <Box borderRadius="2xl" bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.100' }} p={4}>
                <Text fontWeight="semibold">Consent stays explicit</Text>
                <Text mt={2} fontSize="sm" color={mutedText}>
                  Invitations define role, history window, and privacy boundaries before access begins.
                </Text>
              </Box>
            </SimpleGrid>
            {isDemoWorkspace && (
              <Box borderRadius="2xl" bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.100' }} p={4}>
                <Text fontWeight="semibold">Demo mode is ready</Text>
                <Text mt={2} fontSize="sm" color={mutedText}>
                  This workspace already includes a self view plus active-guide and passive-guide relationship states, so
                  you can inspect the product before inviting anyone real.
                </Text>
              </Box>
            )}
          </Stack>
        </Box>
      </GridItem>
      <GridItem>
        <Stack spacing={5}>
          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Badge alignSelf="start" colorScheme="orange" borderRadius="full" px={3} py={1}>
              Next step
            </Badge>
            <Heading size="lg" mt={4}>{nextStep.title}</Heading>
            <Text mt={3} color={mutedText}>
              {nextStep.description}
            </Text>
            <HStack mt={5} spacing={3}>
              <Button as={RouterLink} to={nextStep.path} colorScheme="leaf" onClick={onFinish}>
                {nextStep.actionLabel}
              </Button>
              <Button as={RouterLink} to="/dashboard" variant="ghost" onClick={onFinish}>
                Skip for now
              </Button>
            </HStack>
          </Box>
          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>Signed in as {user.name}</Heading>
            <Stack spacing={2} color={mutedText} fontSize="sm">
              <Text>{user.email}</Text>
              <Text>{user.members.length > 0 ? 'You currently have member relationships to review.' : 'No member relationships are active yet.'}</Text>
              <Text>{user.guides.length > 0 ? 'At least one guide can already see your accountability context.' : 'No guide relationship is active yet.'}</Text>
            </Stack>
          </Box>
        </Stack>
      </GridItem>
    </Grid>
  );
}
