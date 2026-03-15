import {
  Alert,
  AlertIcon,
  Avatar,
  Badge,
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
  Text,
  useToast,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import { weekdayOptions } from '../appConstants';
import type { AdminUser, RelationshipDetails, RelationshipTemplateCard, User } from '../appTypes';
import { relationshipTemplates } from '../relationshipTemplates';

function relationshipTemplateFromDetails(details: RelationshipDetails): RelationshipTemplateCard {
  if (details.mode === 'active' && details.canManageRoutines && details.canManageFollowThrough) {
    return relationshipTemplates[0]!;
  }
  if (details.mode === 'active' && details.canActOnItems && !details.canManageRoutines) {
    return relationshipTemplates[3]!;
  }
  return relationshipTemplates[1]!;
}

function capabilityLines(details: RelationshipDetails): string[] {
  const lines: string[] = [];

  if (details.canActOnItems) {
    lines.push('Can mark items complete or skipped when needed.');
  } else {
    lines.push('Cannot act on your items directly.');
  }

  if (details.canManageRoutines) {
    lines.push('Can create or adjust routines.');
  } else {
    lines.push('Cannot change routines.');
  }

  if (details.canManageFollowThrough) {
    lines.push('Can help manage accountability settings.');
  } else {
    lines.push('Cannot change accountability settings.');
  }

  return lines;
}

function visibilityLines(details: RelationshipDetails): string[] {
  return [
    `History window: ${details.historyWindow ?? 'Future only'}.`,
    details.hiddenItemCount && details.hiddenItemCount > 0
      ? `${details.hiddenItemCount} hidden item${details.hiddenItemCount === 1 ? ' stays' : 's stay'} outside this guide's view.`
      : 'No hidden-item limit is currently recorded for this relationship.',
    'Digest and reminder delivery should match the relationship role rather than a single global guide setting.',
  ];
}

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
  reflectionCadence,
  setReflectionCadence,
  reflectionWeekday,
  setReflectionWeekday,
  reflectionMonthDay,
  setReflectionMonthDay,
  mutedText,
  inviteEmail,
  setInviteEmail,
  selectedTemplateId,
  setSelectedTemplateId,
  isAdmin,
  adminUsers,
  targetMemberId,
  setTargetMemberId,
  onUpdateProfile,
  onUpdateNotificationPreferences,
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
  reflectionCadence: 'daily' | 'weekly' | 'monthly';
  setReflectionCadence: (value: 'daily' | 'weekly' | 'monthly') => void;
  reflectionWeekday: string;
  setReflectionWeekday: (value: string) => void;
  reflectionMonthDay: string;
  setReflectionMonthDay: (value: string) => void;
  mutedText: string;
  inviteEmail: string;
  setInviteEmail: (value: string) => void;
  selectedTemplateId: string;
  setSelectedTemplateId: (value: string) => void;
  isAdmin: boolean;
  adminUsers: AdminUser[];
  targetMemberId: string;
  setTargetMemberId: (value: string) => void;
  onUpdateProfile: () => Promise<void>;
  onUpdateNotificationPreferences: () => Promise<void>;
  onInviteReviewer: () => Promise<void>;
  onAvatarSelected: (file: File | null) => Promise<void>;
}) {
  const toast = useToast();

  const selectedTemplate = useMemo(
    () => relationshipTemplates.find((entry) => entry.id === selectedTemplateId) ?? relationshipTemplates[0]!,
    [selectedTemplateId],
  );

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
              <Button
                colorScheme="leaf"
                alignSelf="start"
                onClick={() => onUpdateProfile().catch((error) => toast({ status: 'error', title: String(error) }))}
              >
                Save Profile
              </Button>
            </Stack>
          </Box>

          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={4}>
              Looking Back Schedule
            </Heading>
            <Text color={mutedText} mb={4}>
              Configure scheduled reflections here. The main app stays focused on capturing reflections, while schedule
              defaults live with the rest of your account configuration.
            </Text>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Cadence</FormLabel>
                <Select
                  bg={inputBg}
                  value={reflectionCadence}
                  onChange={(event) => setReflectionCadence(event.target.value as 'daily' | 'weekly' | 'monthly')}
                >
                  <option value="daily">Daily reflection</option>
                  <option value="weekly">Weekly reflection</option>
                  <option value="monthly">Monthly reflection</option>
                </Select>
              </FormControl>
              {reflectionCadence === 'weekly' ? (
                <FormControl>
                  <FormLabel>Weekly day</FormLabel>
                  <Select bg={inputBg} value={reflectionWeekday} onChange={(event) => setReflectionWeekday(event.target.value)}>
                    {weekdayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
              {reflectionCadence === 'monthly' ? (
                <FormControl>
                  <FormLabel>Day of month</FormLabel>
                  <Select bg={inputBg} value={reflectionMonthDay} onChange={(event) => setReflectionMonthDay(event.target.value)}>
                    {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </Select>
                  <FormHelperText color={mutedText}>
                    Keep this within the first 28 days so every month has a stable schedule.
                  </FormHelperText>
                </FormControl>
              ) : null}
              <Button
                colorScheme="leaf"
                alignSelf="start"
                onClick={() =>
                  onUpdateNotificationPreferences().catch((error) => toast({ status: 'error', title: String(error) }))
                }
              >
                Save Looking Back Schedule
              </Button>
            </Stack>
          </Box>

          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={4}>
              Notification Preferences
            </Heading>
            <Text color={mutedText} mb={4}>
              User-level notification and digest preferences live here with the rest of your account settings.
            </Text>
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
                  <FormLabel>Digest day</FormLabel>
                  <Select bg={inputBg} value={prefDay} onChange={(event) => setPrefDay(event.target.value)}>
                    {weekdayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Digest time</FormLabel>
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
                onClick={() =>
                  onUpdateNotificationPreferences().catch((error) => toast({ status: 'error', title: String(error) }))
                }
              >
                Save Notification Preferences
              </Button>
            </Stack>
          </Box>
        </Stack>
      </GridItem>

      <GridItem>
        <Stack spacing={5}>
          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>
              Relationship Setup
            </Heading>
            <Text color={mutedText} mb={4}>
              Start with a relationship template so the other person understands the level of access, history, and
              notifications you expect before anything is connected.
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {relationshipTemplates.map((template) => {
                const selected = selectedTemplate.id === template.id;
                return (
                  <Button
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    justifyContent="start"
                    h="auto"
                    py={4}
                    px={4}
                    variant="outline"
                    borderRadius="2xl"
                    borderColor={selected ? 'leaf.400' : panelBorder}
                    bg={selected ? 'leaf.50' : 'transparent'}
                    _dark={{ bg: selected ? 'whiteAlpha.100' : 'transparent' }}
                  >
                    <Stack spacing={1} align="start">
                      <Text fontWeight="semibold">{template.label}</Text>
                      <Text fontSize="sm" color={mutedText} whiteSpace="normal" textAlign="left">
                        {template.badge}
                      </Text>
                    </Stack>
                  </Button>
                );
              })}
            </SimpleGrid>
            <Box mt={4} borderRadius="2xl" border="1px solid" borderColor={panelBorder} p={4}>
              <HStack justify="space-between" align="start" spacing={3} mb={3}>
                <Box>
                  <Heading size="sm">{selectedTemplate.label}</Heading>
                  <Text fontSize="sm" color={mutedText} mt={1}>
                    {selectedTemplate.mode === 'active' ? 'Active operational role' : 'Summary-only role'}
                  </Text>
                </Box>
                <Badge
                  bg={selectedTemplate.mode === 'active' ? 'leaf.100' : 'blackAlpha.100'}
                  color={selectedTemplate.mode === 'active' ? 'leaf.800' : 'inherit'}
                  _dark={{
                    bg: selectedTemplate.mode === 'active' ? 'leaf.800' : 'whiteAlpha.160',
                    color: selectedTemplate.mode === 'active' ? 'leaf.100' : 'inherit',
                  }}
                  borderRadius="full"
                  px={3}
                  py={1}
                >
                  {selectedTemplate.badge}
                </Badge>
              </HStack>
              <Stack spacing={3} fontSize="sm">
                <Text>
                  <strong>What they can do:</strong> {selectedTemplate.guideCanDo}
                </Text>
                <Text>
                  <strong>What they receive:</strong> {selectedTemplate.guideReceives}
                </Text>
                <Text>
                  <strong>History by default:</strong> {selectedTemplate.history}
                </Text>
                <Text>
                  <strong>Privacy boundary:</strong> {selectedTemplate.privacy}
                </Text>
              </Stack>
            </Box>
            <Alert status="info" borderRadius="2xl">
              <AlertIcon />
              Invite email starts the relationship. Confirm the final permission details after the connection is active.
            </Alert>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input bg={inputBg} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
                <FormHelperText color={mutedText}>
                  Send this as a {selectedTemplate.label} invitation so expectations are clear before acceptance.
                </FormHelperText>
              </FormControl>
              {isAdmin && adminUsers.length > 0 && (
                <FormControl>
                  <FormLabel>Create relationship for</FormLabel>
                  <Select bg={inputBg} value={targetMemberId} onChange={(event) => setTargetMemberId(event.target.value)}>
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
                Send Relationship Invite
              </Button>
            </Stack>
          </Box>

          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>
              Your Guides
            </Heading>
            <Text color={mutedText} mb={4}>
              Review each guide's access here. Hidden items stay private, but this page should make visibility and history
              rules explicit instead of implied.
            </Text>
            <Stack spacing={4}>
              {user.guides.length === 0 ? (
                <Box borderRadius="2xl" border="1px solid" borderColor={panelBorder} p={4}>
                  <Text fontWeight="semibold">No guides connected yet</Text>
                  <Text color={mutedText} fontSize="sm" mt={1}>
                    Use the relationship setup flow above to invite someone with clear expectations.
                  </Text>
                </Box>
              ) : (
                user.guides.map((entry) => {
                  const template = relationshipTemplateFromDetails(entry);
                  return (
                    <Box key={entry.guide.id} borderRadius="2xl" border="1px solid" borderColor={panelBorder} p={4}>
                      <HStack justify="space-between" align="start" spacing={3} mb={3}>
                        <Box>
                          <Text fontWeight="semibold">{entry.guide.name}</Text>
                          <Text fontSize="sm" color={mutedText}>
                            {entry.guide.email}
                          </Text>
                        </Box>
                        <Stack spacing={2} align="end">
                          <Badge
                            bg={entry.mode === 'active' ? 'leaf.100' : 'blackAlpha.100'}
                            color={entry.mode === 'active' ? 'leaf.800' : 'inherit'}
                            _dark={{
                              bg: entry.mode === 'active' ? 'leaf.800' : 'whiteAlpha.160',
                              color: entry.mode === 'active' ? 'leaf.100' : 'inherit',
                            }}
                            borderRadius="full"
                            px={3}
                            py={1}
                          >
                            {template.label}
                          </Badge>
                          <Badge variant="subtle" borderRadius="full" px={3} py={1}>
                            {entry.mode === 'active' ? 'Can take action' : 'Visibility only'}
                          </Badge>
                        </Stack>
                      </HStack>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <Stack spacing={2}>
                          <Text fontWeight="medium">What this guide can do</Text>
                          {capabilityLines(entry).map((line) => (
                            <Text key={line} fontSize="sm" color={mutedText}>
                              {line}
                            </Text>
                          ))}
                        </Stack>
                        <Stack spacing={2}>
                          <Text fontWeight="medium">Visibility and notifications</Text>
                          {visibilityLines(entry).map((line) => (
                            <Text key={line} fontSize="sm" color={mutedText}>
                              {line}
                            </Text>
                          ))}
                        </Stack>
                      </SimpleGrid>
                    </Box>
                  );
                })
              )}
            </Stack>
          </Box>

          <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
            <Heading size="md" mb={3}>
              Your Members
            </Heading>
            <Text color={mutedText} mb={4}>
              Direction matters. If support is reciprocal, each direction should still describe its own permissions and
              visibility boundary.
            </Text>
            <Stack spacing={4}>
              {user.members.length === 0 ? (
                <Box borderRadius="2xl" border="1px solid" borderColor={panelBorder} p={4}>
                  <Text fontWeight="semibold">You are not guiding anyone yet</Text>
                  <Text color={mutedText} fontSize="sm" mt={1}>
                    Relationships only appear here once you have an explicit review direction.
                  </Text>
                </Box>
              ) : (
                user.members.map((entry) => (
                  <Box key={entry.member.id} borderRadius="2xl" border="1px solid" borderColor={panelBorder} p={4}>
                    <HStack justify="space-between" align="start" spacing={3} mb={3}>
                      <Box>
                        <Text fontWeight="semibold">{entry.member.name}</Text>
                        <Text fontSize="sm" color={mutedText}>
                          {entry.member.email}
                        </Text>
                      </Box>
                      <Badge
                        bg={entry.mode === 'active' ? 'leaf.100' : 'blackAlpha.100'}
                        color={entry.mode === 'active' ? 'leaf.800' : 'inherit'}
                        _dark={{
                          bg: entry.mode === 'active' ? 'leaf.800' : 'whiteAlpha.160',
                          color: entry.mode === 'active' ? 'leaf.100' : 'inherit',
                        }}
                        borderRadius="full"
                        px={3}
                        py={1}
                      >
                        {entry.mode === 'active' ? 'Active guide' : 'Passive guide'}
                      </Badge>
                    </HStack>
                    <Stack spacing={2}>
                      {capabilityLines(entry).map((line) => (
                        <Text key={line} fontSize="sm" color={mutedText}>
                          {line}
                        </Text>
                      ))}
                      <Text fontSize="sm" color={mutedText}>
                        History window: {entry.historyWindow ?? 'Future only'}.
                      </Text>
                    </Stack>
                  </Box>
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      </GridItem>
    </Grid>
  );
}
