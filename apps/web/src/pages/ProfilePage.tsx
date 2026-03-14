import {
  Avatar,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  useToast,
} from '@chakra-ui/react';
import { weekdayOptions } from '../appConstants';
import type { AdminUser, User } from '../appTypes';

export function ProfilePage({
  user,
  profileName,
  setProfileName,
  profileAvatarUrl,
  setProfileAvatarUrl,
  inputBg,
  panelBgStrong,
  panelBorder,
  statGlow,
  prefTimezone,
  setPrefTimezone,
  prefDay,
  setPrefDay,
  prefHour,
  setPrefHour,
  mutedText,
  inviteEmail,
  setInviteEmail,
  isAdmin,
  adminUsers,
  targetUserId,
  setTargetUserId,
  onUpdatePreferences,
  onInviteReviewer,
  onAvatarSelected,
}: {
  user: User;
  profileName: string;
  setProfileName: (value: string) => void;
  profileAvatarUrl: string | null;
  setProfileAvatarUrl: (value: string | null) => void;
  inputBg: string;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  prefTimezone: string;
  setPrefTimezone: (value: string) => void;
  prefDay: string;
  setPrefDay: (value: string) => void;
  prefHour: string;
  setPrefHour: (value: string) => void;
  mutedText: string;
  inviteEmail: string;
  setInviteEmail: (value: string) => void;
  isAdmin: boolean;
  adminUsers: AdminUser[];
  targetUserId: string;
  setTargetUserId: (value: string) => void;
  onUpdatePreferences: () => Promise<void>;
  onInviteReviewer: () => Promise<void>;
  onAvatarSelected: (file: File | null) => Promise<void>;
}) {
  const toast = useToast();

  return (
    <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
      <GridItem>
        <Stack spacing={5}>
          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={4}>
              Profile
            </Heading>
            <Stack spacing={4}>
              <HStack spacing={4} align="center">
                <Avatar size="xl" name={profileName || user.email} src={profileAvatarUrl ?? undefined} />
                <Stack spacing={2}>
                  <Button as="label" variant="outline" cursor="pointer">
                    Upload photo
                    <Input
                      display="none"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(event) => {
                        onAvatarSelected(event.target.files?.[0] ?? null).catch((error) =>
                          toast({ status: 'error', title: String(error) }),
                        );
                        event.target.value = '';
                      }}
                    />
                  </Button>
                  {profileAvatarUrl && (
                    <Button variant="ghost" size="sm" onClick={() => setProfileAvatarUrl(null)}>
                      Remove photo
                    </Button>
                  )}
                </Stack>
              </HStack>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input bg={inputBg} value={profileName} onChange={(event) => setProfileName(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input bg={inputBg} value={user.email} isReadOnly />
              </FormControl>
            </Stack>
          </Box>

          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={4}>
              Digest
            </Heading>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Timezone</FormLabel>
                <Input bg={inputBg} value={prefTimezone} onChange={(event) => setPrefTimezone(event.target.value)} />
                <FormHelperText color={mutedText}>
                  Use an IANA timezone such as `America/Los_Angeles`.
                </FormHelperText>
              </FormControl>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Day</FormLabel>
                  <Select bg={inputBg} value={prefDay} onChange={(event) => setPrefDay(event.target.value)}>
                    {weekdayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Time</FormLabel>
                  <Select bg={inputBg} value={prefHour} onChange={(event) => setPrefHour(event.target.value)}>
                    {Array.from({ length: 24 }, (_, hour) => hour).map((hour) => (
                      <option key={hour} value={hour}>
                        {hour.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
              <Button
                colorScheme="leaf"
                alignSelf="start"
                onClick={() => onUpdatePreferences().catch((error) => toast({ status: 'error', title: String(error) }))}
              >
                Save Preferences
              </Button>
            </Stack>
          </Box>
        </Stack>
      </GridItem>

      <GridItem>
        <Stack spacing={5}>
          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>
              Invite
            </Heading>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input bg={inputBg} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
              </FormControl>
              {isAdmin && adminUsers.length > 0 && (
                <FormControl>
                  <FormLabel>Send invite for</FormLabel>
                  <Select bg={inputBg} value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)}>
                    {adminUsers.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.email})
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Button
                colorScheme="leaf"
                alignSelf="start"
                onClick={() => onInviteReviewer().catch((error) => toast({ status: 'error', title: String(error) }))}
              >
                Send Invite
              </Button>
            </Stack>
          </Box>

          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>
              Relationships
            </Heading>
            <SimpleGrid columns={2} spacing={4}>
              <Stat>
                <StatLabel color={mutedText}>Reviewing you</StatLabel>
                <StatNumber>{user.reviewers.length}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel color={mutedText}>You review</StatLabel>
                <StatNumber>{user.reviewTargets.length}</StatNumber>
              </Stat>
            </SimpleGrid>
          </Box>
        </Stack>
      </GridItem>
    </Grid>
  );
}
