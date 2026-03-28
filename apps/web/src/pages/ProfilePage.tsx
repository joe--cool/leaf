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
import {
  hiddenItemVisibilityOptions,
  relationshipHistoryWindowOptions,
  relationshipTemplateSettings,
  type RelationshipUpdateInput,
} from '@leaf/shared';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { weekdayOptions } from '../appConstants';
import type { AdminUser, RelationshipDetails, RelationshipTemplateCard, User } from '../appTypes';
import { relationshipTemplates } from '../relationshipTemplates';
import {
  hiddenItemVisibilityDescription,
  hiddenItemVisibilityLabel,
  hiddenItemsBoundaryText,
  relationshipHistorySummary,
} from '../relationshipUi';

function relationshipTemplateFromDetails(details: RelationshipDetails): RelationshipTemplateCard {
  if (details.templateId) {
    const template = relationshipTemplates.find((entry) => entry.id === details.templateId);
    if (template) return template;
  }
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
    `History window: ${details.historyWindow ? relationshipHistorySummary(details.historyWindow) : 'Future only.'}`,
    hiddenItemsBoundaryText(details.hiddenItemCount ?? 0, details.hiddenItemVisibility ?? 'show-count'),
    'Digest and reminder delivery should match the relationship role rather than a single global guide setting.',
  ];
}

function receivesLine(details: RelationshipDetails) {
  if (details.mode === 'active') {
    return details.canManageFollowThrough
      ? 'Receives action-oriented updates, accountability context, and relationship review expectations.'
      : 'Receives action-oriented updates without accountability-setting controls.';
  }

  return 'Receives visibility-first summaries and digest context without intervention-heavy prompts.';
}

function draftFromRelationship(details: RelationshipDetails): RelationshipUpdateInput {
  return {
    mode: details.mode === 'active' ? 'active' : 'passive',
    canActOnItems: details.mode === 'active' ? (details.canActOnItems ?? false) : false,
    canManageRoutines: details.mode === 'active' ? (details.canManageRoutines ?? false) : false,
    canManageFollowThrough: details.mode === 'active' ? (details.canManageFollowThrough ?? false) : false,
    historyWindow: details.historyWindow ?? 'future-only',
    hiddenItemVisibility: details.hiddenItemVisibility ?? 'show-count',
  };
}

function settingsMatch(left: RelationshipUpdateInput, right: RelationshipUpdateInput) {
  return (
    left.mode === right.mode &&
    left.canActOnItems === right.canActOnItems &&
    left.canManageRoutines === right.canManageRoutines &&
    left.canManageFollowThrough === right.canManageFollowThrough &&
    left.historyWindow === right.historyWindow &&
    left.hiddenItemVisibility === right.hiddenItemVisibility
  );
}

function EditableGuideRelationshipCard({
  entry,
  inputBg,
  panelBorder,
  mutedText,
  onSave,
}: {
  entry: User['guides'][number];
  inputBg: string;
  panelBorder: string;
  mutedText: string;
  onSave: (guideId: string, input: RelationshipUpdateInput) => Promise<void>;
}) {
  const toast = useToast();
  const template = relationshipTemplateFromDetails(entry);
  const templateDefaults = relationshipTemplateSettings(template.id);
  const savedState = draftFromRelationship(entry);
  const [draft, setDraft] = useState<RelationshipUpdateInput>(savedState);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(draftFromRelationship(entry));
  }, [entry]);

  const effectiveDraft =
    draft.mode === 'active'
      ? draft
      : {
          ...draft,
          canActOnItems: false,
          canManageRoutines: false,
          canManageFollowThrough: false,
        };
  const differsFromTemplate = !settingsMatch(savedState, templateDefaults);
  const hasUnsavedChanges = !settingsMatch(savedState, effectiveDraft);

  return (
    <Box borderRadius="2xl" border="1px solid" borderColor={panelBorder} p={4}>
      <HStack justify="space-between" align="start" spacing={3} mb={3}>
        <Box>
          <Text fontWeight="semibold">{entry.guide.name}</Text>
          <Text fontSize="sm" color={mutedText}>
            {entry.guide.email}
          </Text>
        </Box>
        <Stack spacing={2} align="end">
          <Badge
            bg={effectiveDraft.mode === 'active' ? 'leaf.100' : 'blackAlpha.100'}
            color={effectiveDraft.mode === 'active' ? 'leaf.800' : 'inherit'}
            _dark={{
              bg: effectiveDraft.mode === 'active' ? 'leaf.800' : 'whiteAlpha.160',
              color: effectiveDraft.mode === 'active' ? 'leaf.100' : 'inherit',
            }}
            borderRadius="full"
            px={3}
            py={1}
          >
            {template.label}
          </Badge>
          <Badge variant="subtle" borderRadius="full" px={3} py={1}>
            {effectiveDraft.mode === 'active' ? 'Current: active guide' : 'Current: passive guide'}
          </Badge>
        </Stack>
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={4}>
        <Box borderRadius="xl" bg="blackAlpha.50" p={3}>
          <Text fontWeight="medium" mb={2}>
            Template defaults
          </Text>
          <Text fontSize="sm" color={mutedText}>
            {template.label} starts with {template.mode === 'active' ? 'an active guide role' : 'a passive guide role'}.
          </Text>
          <Text fontSize="sm" color={mutedText} mt={2}>
            {template.guideCanDo}
          </Text>
          <Text fontSize="sm" color={mutedText} mt={2}>
            {template.guideReceives}
          </Text>
          <Text fontSize="sm" color={mutedText} mt={2}>
            {template.history}
          </Text>
        </Box>
        <Box borderRadius="xl" bg="blackAlpha.50" p={3}>
          <Text fontWeight="medium" mb={2}>
            Current saved relationship
          </Text>
          <Text fontSize="sm" color={mutedText}>
            {savedState.mode === 'active' ? 'Active guide permissions are enabled.' : 'Passive guide visibility is enabled.'}
          </Text>
          <Text fontSize="sm" color={mutedText} mt={2}>
            {receivesLine(entry)}
          </Text>
          <Text fontSize="sm" color={mutedText} mt={2}>
            {entry.historyWindow ? relationshipHistorySummary(entry.historyWindow) : 'Future only.'}
          </Text>
          <Text fontSize="sm" color={mutedText} mt={2}>
            {hiddenItemsBoundaryText(entry.hiddenItemCount ?? 0, entry.hiddenItemVisibility ?? 'show-count')}
          </Text>
        </Box>
      </SimpleGrid>

      {differsFromTemplate ? (
        <Alert status="info" borderRadius="2xl" mb={4}>
          <AlertIcon />
          This relationship no longer matches the original {template.label} defaults. Saved settings below are the source
          of truth.
        </Alert>
      ) : null}

      {entry.templateId === 'parent' ? (
        <Alert status="warning" borderRadius="2xl" mb={4}>
          <AlertIcon />
          Parent relationships are a special case. Keep family oversight explicit, and use broader history only when the
          member expects it.
        </Alert>
      ) : null}

      <Stack spacing={4}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl>
            <FormLabel>Guide mode</FormLabel>
            <Select
              bg={inputBg}
              value={draft.mode}
              onChange={(event) =>
                setDraft((current) =>
                  event.target.value === 'active'
                    ? { ...current, mode: 'active' }
                    : {
                        ...current,
                        mode: 'passive',
                        canActOnItems: false,
                        canManageRoutines: false,
                        canManageFollowThrough: false,
                      },
                )
              }
            >
              <option value="active">Active guide</option>
              <option value="passive">Passive guide</option>
            </Select>
            <FormHelperText color={mutedText}>
              Active guides can receive operational context. Passive guides stay summary-oriented.
            </FormHelperText>
          </FormControl>

          <FormControl>
            <FormLabel>History access</FormLabel>
            <Select
              bg={inputBg}
              value={draft.historyWindow}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  historyWindow: event.target.value as RelationshipUpdateInput['historyWindow'],
                }))
              }
            >
              {relationshipHistoryWindowOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <FormHelperText color={mutedText}>
              {relationshipHistoryWindowOptions.find((option) => option.value === draft.historyWindow)?.description}
            </FormHelperText>
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel>Permission groups</FormLabel>
          <Stack spacing={3}>
            <Box as="label" display="flex" alignItems="center" gap={3} cursor={draft.mode === 'active' ? 'pointer' : 'not-allowed'}>
              <Box
                as="input"
                type="checkbox"
                checked={effectiveDraft.canActOnItems}
                disabled={draft.mode !== 'active'}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDraft((current) => ({ ...current, canActOnItems: event.target.checked }))
                }
              />
              <Text>Can act on items</Text>
            </Box>
            <Box as="label" display="flex" alignItems="center" gap={3} cursor={draft.mode === 'active' ? 'pointer' : 'not-allowed'}>
              <Box
                as="input"
                type="checkbox"
                checked={effectiveDraft.canManageRoutines}
                disabled={draft.mode !== 'active'}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDraft((current) => ({ ...current, canManageRoutines: event.target.checked }))
                }
              />
              <Text>Can manage routines</Text>
            </Box>
            <Box as="label" display="flex" alignItems="center" gap={3} cursor={draft.mode === 'active' ? 'pointer' : 'not-allowed'}>
              <Box
                as="input"
                type="checkbox"
                checked={effectiveDraft.canManageFollowThrough}
                disabled={draft.mode !== 'active'}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDraft((current) => ({ ...current, canManageFollowThrough: event.target.checked }))
                }
              />
              <Text>Can manage accountability settings</Text>
            </Box>
          </Stack>
          <FormHelperText color={mutedText}>
            Passive guide mode removes operational controls even if this template started as active.
          </FormHelperText>
        </FormControl>

        <FormControl>
          <FormLabel>Hidden-item boundary</FormLabel>
          <Select
            bg={inputBg}
            value={draft.hiddenItemVisibility}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                hiddenItemVisibility: event.target.value as RelationshipUpdateInput['hiddenItemVisibility'],
              }))
            }
          >
            {hiddenItemVisibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <FormHelperText color={mutedText}>
            {hiddenItemVisibilityOptions.find((option) => option.value === draft.hiddenItemVisibility)?.description}
          </FormHelperText>
        </FormControl>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Box borderRadius="xl" bg="blackAlpha.50" p={3}>
            <Text fontWeight="medium" mb={2}>
              What this guide can see
            </Text>
            <Text fontSize="sm" color={mutedText}>
              {relationshipHistorySummary(effectiveDraft.historyWindow)}
            </Text>
            <Text fontSize="sm" color={mutedText} mt={2}>
              {hiddenItemVisibilityLabel(effectiveDraft.hiddenItemVisibility)}.{' '}
              {hiddenItemVisibilityDescription(effectiveDraft.hiddenItemVisibility)}
            </Text>
          </Box>
          <Box borderRadius="xl" bg="blackAlpha.50" p={3}>
            <Text fontWeight="medium" mb={2}>
              What this guide can do and receive
            </Text>
            {capabilityLines(effectiveDraft).map((line) => (
              <Text key={line} fontSize="sm" color={mutedText}>
                {line}
              </Text>
            ))}
            <Text fontSize="sm" color={mutedText} mt={2}>
              {receivesLine(effectiveDraft)}
            </Text>
          </Box>
        </SimpleGrid>

        <HStack justify="space-between" align="center" flexWrap="wrap">
          <Button
            variant="ghost"
            onClick={() => setDraft(templateDefaults)}
            isDisabled={isSaving}
          >
            Reset to template defaults
          </Button>
          <Button
            colorScheme="leaf"
            isLoading={isSaving}
            isDisabled={!hasUnsavedChanges}
            onClick={async () => {
              setIsSaving(true);
              try {
                await onSave(entry.guide.id, effectiveDraft);
              } catch (error) {
                toast({ status: 'error', title: String(error) });
              } finally {
                setIsSaving(false);
              }
            }}
          >
            Save relationship
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
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
  onUpdateGuideRelationship,
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
  onUpdateGuideRelationship: (guideId: string, input: RelationshipUpdateInput) => Promise<void>;
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
                user.guides.map((entry) => (
                  <EditableGuideRelationshipCard
                    key={entry.guide.id}
                    entry={entry}
                    inputBg={inputBg}
                    panelBorder={panelBorder}
                    mutedText={mutedText}
                    onSave={onUpdateGuideRelationship}
                  />
                ))
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
                          {relationshipTemplateFromDetails(entry).label}
                        </Badge>
                        <Badge variant="subtle" borderRadius="full" px={3} py={1}>
                          {entry.mode === 'active' ? 'Active guide' : 'Passive guide'}
                        </Badge>
                      </Stack>
                    </HStack>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Stack spacing={2}>
                        <Text fontWeight="medium">What you can do</Text>
                      {capabilityLines(entry).map((line) => (
                        <Text key={line} fontSize="sm" color={mutedText}>
                          {line}
                        </Text>
                      ))}
                      <Text fontSize="sm" color={mutedText}>
                        {receivesLine(entry)}
                      </Text>
                      </Stack>
                      <Stack spacing={2}>
                        <Text fontWeight="medium">Visibility and privacy</Text>
                        {visibilityLines(entry).map((line) => (
                          <Text key={line} fontSize="sm" color={mutedText}>
                            {line}
                          </Text>
                        ))}
                      </Stack>
                    </SimpleGrid>
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
