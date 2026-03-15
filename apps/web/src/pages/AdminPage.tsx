import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Select,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import type { AdminUser } from '../appTypes';

export function AdminPage({
  isAdmin,
  adminUsers,
  adminReviewerId,
  adminRevieweeId,
  setAdminReviewerId,
  setAdminRevieweeId,
  onSaveMapping,
  modeGradient,
  panelBgStrong,
  panelBorder,
  statGlow,
  mutedText,
  panelBg,
}: {
  isAdmin: boolean;
  adminUsers: AdminUser[];
  adminReviewerId: string;
  adminRevieweeId: string;
  setAdminReviewerId: (value: string) => void;
  setAdminRevieweeId: (value: string) => void;
  onSaveMapping: () => Promise<void>;
  modeGradient: string;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  mutedText: string;
  panelBg: string;
}) {
  const toast = useToast();

  if (!isAdmin) {
    return (
      <Alert status="warning" borderRadius="2xl" bg={panelBgStrong} border="1px solid" borderColor={panelBorder}>
        <AlertIcon />
        Admin role required.
      </Alert>
    );
  }

  return (
    <Stack spacing={5}>
      <Box bgGradient={modeGradient} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <HStack justify="space-between" align={{ base: 'start', md: 'center' }} flexWrap="wrap" spacing={4}>
          <Box>
            <Badge bg="clay.200" color="clay.900" _dark={{ bg: 'clay.700', color: 'clay.50' }} borderRadius="full" px={3} py={1}>
              Admin
            </Badge>
            <Heading size="lg" mt={3}>
              Workspace administration
            </Heading>
            <Text mt={2} color={mutedText} maxW="42rem">
              User management and relationship assignments for the whole workspace.
            </Text>
          </Box>
          <Box bg="whiteAlpha.420" _dark={{ bg: 'whiteAlpha.120' }} borderRadius="2xl" px={4} py={3}>
            <Text fontSize="sm" color={mutedText}>
              Active users
            </Text>
            <Text fontWeight="bold" fontSize="2xl">
              {adminUsers.length}
            </Text>
          </Box>
        </HStack>
      </Box>

      <Grid templateColumns={{ base: '1fr', xl: '1.05fr 0.95fr' }} gap={5}>
        <GridItem>
          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>
              Users
            </Heading>
            <Stack spacing={3}>
              {adminUsers.map((entry) => (
                <Flex key={entry.id} justify="space-between" align="center" bg={panelBg} borderRadius="2xl" px={4} py={4}>
                  <Box>
                    <Text fontWeight="semibold">{entry.name}</Text>
                    <Text fontSize="sm" color={mutedText}>
                      {entry.email}
                    </Text>
                  </Box>
                  <Badge bg="clay.200" color="clay.900" _dark={{ bg: 'clay.700', color: 'clay.50' }} borderRadius="full" px={3} py={1}>
                    {entry.roles.map((role) => role.role).join(', ')}
                  </Badge>
                </Flex>
              ))}
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>
              Relationship Mapping
            </Heading>
            <Stack spacing={4}>
              <Text color={mutedText} fontSize="sm">
                Use this to connect existing users when an email invite is not the right path. New admin-made
                relationships start as passive and can be reviewed from Profile & Relationships.
              </Text>
              <FormControl>
                <FormLabel>Reviewer</FormLabel>
                <Select value={adminReviewerId} onChange={(event) => setAdminReviewerId(event.target.value)}>
                  {adminUsers.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.email})
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Reviewee</FormLabel>
                <Select value={adminRevieweeId} onChange={(event) => setAdminRevieweeId(event.target.value)}>
                  {adminUsers.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.email})
                    </option>
                  ))}
                </Select>
              </FormControl>
              <Button
                colorScheme="clay"
                onClick={() =>
                  onSaveMapping().catch((error) => toast({ status: 'error', title: String(error) }))
                }
              >
                Save Mapping
              </Button>
            </Stack>
          </Box>
        </GridItem>
      </Grid>
    </Stack>
  );
}
