import {
  Badge,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  Radio,
  RadioGroup,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { DayPicker } from 'react-day-picker';
import { categoryOptions, scheduleKindOptions, weekdayOptions } from '../appConstants';
import { itemTemplateOptions } from '../itemTemplates';
import { getCategoryLabel, getDefaultTitle, summarizeSchedule, toInputDateTime } from '../scheduleUtils';
import type { DraftSchedule, Item, ItemCreationMode, SingleScheduleKind } from '../appTypes';

export function RoutinesPage({
  panelBgStrong,
  panelBorder,
  statGlow,
  sectionBg,
  inputBg,
  panelBg,
  mutedText,
  modeGradient,
  title,
  setTitle,
  category,
  onCategoryChange,
  selectedTemplateId,
  onSelectTemplate,
  creationMode,
  onCreationModeChange,
  editingItemId,
  onEditItem,
  onCancelEditing,
  draftSchedules,
  updateDraftSchedule,
  addSchedule,
  removeSchedule,
  updateDailyTime,
  addDailyTime,
  removeDailyTime,
  updateCustomDate,
  addCustomDate,
  removeCustomDate,
  notificationEnabled,
  setNotificationEnabled,
  hardToDismiss,
  setHardToDismiss,
  repeatMinutes,
  setRepeatMinutes,
  onSaveItem,
  items,
}: {
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  sectionBg: string;
  inputBg: string;
  panelBg: string;
  mutedText: string;
  modeGradient: string;
  title: string;
  setTitle: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  selectedTemplateId: string;
  onSelectTemplate: (value: string) => void;
  creationMode: ItemCreationMode;
  onCreationModeChange: (value: ItemCreationMode) => void;
  editingItemId: string | null;
  onEditItem: (item: Item) => void;
  onCancelEditing: () => void;
  draftSchedules: DraftSchedule[];
  updateDraftSchedule: (index: number, mutator: (current: DraftSchedule) => DraftSchedule) => void;
  addSchedule: () => void;
  removeSchedule: (index: number) => void;
  updateDailyTime: (scheduleIndex: number, timeIndex: number, value: string) => void;
  addDailyTime: (scheduleIndex: number) => void;
  removeDailyTime: (scheduleIndex: number, timeIndex: number) => void;
  updateCustomDate: (scheduleIndex: number, dateIndex: number, value: string) => void;
  addCustomDate: (scheduleIndex: number) => void;
  removeCustomDate: (scheduleIndex: number, dateIndex: number) => void;
  notificationEnabled: boolean;
  setNotificationEnabled: (value: boolean) => void;
  hardToDismiss: boolean;
  setHardToDismiss: (value: boolean) => void;
  repeatMinutes: string;
  setRepeatMinutes: (value: string) => void;
  onSaveItem: () => Promise<void>;
  items: Item[];
}) {
  const advancedEditor = useDisclosure();
  const primaryDraft = draftSchedules[0];
  const hasAdvancedSchedule = draftSchedules.length > 1 || primaryDraft?.kind === 'CUSTOM_DATES';
  const advancedForcedOpen = editingItemId !== null || hasAdvancedSchedule;
  const advancedOpen = advancedForcedOpen || advancedEditor.isOpen;
  const previewItem: Item = {
    id: editingItemId ?? 'draft',
    title: title || 'Untitled item',
    category,
    scheduleKind: draftSchedules.length > 1 ? 'MULTI' : (primaryDraft?.kind ?? 'DAILY'),
    scheduleData:
      draftSchedules.length > 1
        ? {
            kind: 'MULTI',
            schedules: draftSchedules.map((draft) => ({
              kind: draft.kind,
              label: draft.label,
              oneTimeAt: draft.oneTimeAt,
              dailyTimes: draft.dailyTimes,
              weekdays: draft.weekdays,
              intervalDays: Number(draft.intervalDays),
              intervalAnchor: draft.intervalAnchor,
              customDates: draft.customDates,
            })),
          }
        : {
            kind: primaryDraft?.kind ?? 'DAILY',
            label: primaryDraft?.label,
            oneTimeAt: primaryDraft?.oneTimeAt,
            dailyTimes: primaryDraft?.dailyTimes,
            weekdays: primaryDraft?.weekdays,
            intervalDays: Number(primaryDraft?.intervalDays),
            intervalAnchor: primaryDraft?.intervalAnchor,
            customDates: primaryDraft?.customDates,
          },
  };

  return (
    <Grid templateColumns={{ base: '1fr', xl: '1.08fr 0.92fr' }} gap={5}>
      <GridItem>
        <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
          <Heading size="md" mb={3}>
            {editingItemId ? 'Edit tracked item' : 'Create tracked item'}
          </Heading>
          <Stack spacing={4}>
            <Box bg={sectionBg} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
              <Text fontWeight="semibold" mb={1}>
                1. Start from a template or scratch
              </Text>
              <RadioGroup value={selectedTemplateId} onChange={onSelectTemplate}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  {itemTemplateOptions.map((template) => (
                    <Box
                      key={template.id}
                      as="label"
                      bg={selectedTemplateId === template.id ? modeGradient : panelBg}
                      border="1px solid"
                      borderColor={selectedTemplateId === template.id ? 'leaf.500' : panelBorder}
                      borderRadius="xl"
                      px={4}
                      py={4}
                      cursor="pointer"
                    >
                      <Stack align="start" spacing={1}>
                        <Radio value={template.id} colorScheme="leaf">
                          {template.label}
                        </Radio>
                        <Text fontSize="sm" color={mutedText} pl={6}>
                          {template.description}
                        </Text>
                      </Stack>
                    </Box>
                  ))}
                  <Box
                    as="label"
                    bg={selectedTemplateId === 'scratch' ? modeGradient : panelBg}
                    border="1px solid"
                    borderColor={selectedTemplateId === 'scratch' ? 'leaf.500' : panelBorder}
                    borderRadius="xl"
                    px={4}
                    py={4}
                    cursor="pointer"
                  >
                    <Stack align="start" spacing={1}>
                      <Radio value="scratch" colorScheme="leaf">
                        Start from scratch
                      </Radio>
                      <Text fontSize="sm" color={mutedText} pl={6}>
                        Choose the title, category, and schedule manually.
                      </Text>
                    </Stack>
                  </Box>
                </SimpleGrid>
              </RadioGroup>
            </Box>

            <Box bg={sectionBg} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
              <Text fontWeight="semibold" mb={1}>
                2. Choose recurring or one-time
              </Text>
              <RadioGroup value={creationMode} onChange={(value) => onCreationModeChange(value as ItemCreationMode)}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  {[
                    { value: 'recurring', label: 'Recurring item', detail: 'Use this for habits, routines, or ongoing commitments.' },
                    { value: 'one-time', label: 'One-time item', detail: 'Use this for a single due date or one-off responsibility.' },
                  ].map((option) => (
                    <Box
                      key={option.value}
                      as="label"
                      bg={creationMode === option.value ? modeGradient : panelBg}
                      border="1px solid"
                      borderColor={creationMode === option.value ? 'leaf.500' : panelBorder}
                      borderRadius="xl"
                      px={4}
                      py={4}
                      cursor="pointer"
                    >
                      <Stack align="start" spacing={1}>
                        <Radio value={option.value} colorScheme="leaf">
                          {option.label}
                        </Radio>
                        <Text color={mutedText} fontSize="sm" pl={6}>
                          {option.detail}
                        </Text>
                      </Stack>
                    </Box>
                  ))}
                </SimpleGrid>
              </RadioGroup>
            </Box>

            <Box bg={sectionBg} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
              <Text fontWeight="semibold" mb={1}>
                3. Set up the item
              </Text>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Item name</FormLabel>
                  <Input bg={inputBg} placeholder={getDefaultTitle(category)} value={title} onChange={(event) => setTitle(event.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Life area</FormLabel>
                  <Select bg={inputBg} value={category} onChange={(event) => onCategoryChange(event.target.value)}>
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {creationMode === 'one-time' ? (
                  <FormControl>
                    <FormLabel>When should it happen?</FormLabel>
                    <Input
                      bg={inputBg}
                      type="datetime-local"
                      value={primaryDraft?.oneTimeAt ?? ''}
                      onChange={(event) =>
                        updateDraftSchedule(0, (current) => ({
                          ...current,
                          kind: 'ONE_TIME',
                          oneTimeAt: event.target.value,
                        }))
                      }
                    />
                  </FormControl>
                ) : hasAdvancedSchedule ? (
                  <Box bg={panelBg} borderRadius="2xl" p={4}>
                    <Text fontWeight="semibold">Advanced schedule active</Text>
                    <Text color={mutedText} fontSize="sm" mt={1}>
                      This item uses {draftSchedules.length > 1 ? 'multiple schedules' : 'specific dates'}. Open advanced scheduling below to edit it.
                    </Text>
                  </Box>
                ) : (
                  <RecurringQuickEditor
                    draft={primaryDraft}
                    inputBg={inputBg}
                    panelBg={panelBg}
                    panelBorder={panelBorder}
                    mutedText={mutedText}
                    updateDraftSchedule={updateDraftSchedule}
                  />
                )}
              </Stack>
            </Box>

            <Box bg={sectionBg} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
              <HStack justify="space-between" align="center" mb={3}>
                <Text fontWeight="semibold">4. Advanced scheduling and reminders</Text>
                <Button size="sm" variant="outline" onClick={advancedEditor.onToggle} isDisabled={advancedForcedOpen}>
                  {advancedForcedOpen ? 'Advanced options required' : advancedOpen ? 'Hide advanced options' : 'Show advanced options'}
                </Button>
              </HStack>
              {advancedOpen && (
                <Stack spacing={4}>
                  <Box border="1px solid" borderColor={panelBorder} borderRadius="2xl" p={4}>
                    <HStack justify="space-between" align="center" mb={3}>
                      <Text fontWeight="semibold">Scheduling details</Text>
                      <Button size="sm" variant="outline" onClick={addSchedule}>
                        Add another schedule
                      </Button>
                    </HStack>
                    <Stack spacing={4}>
                      {draftSchedules.map((draft, scheduleIndex) => (
                        <ScheduleEditor
                          key={`schedule-${scheduleIndex}`}
                          draft={draft}
                          scheduleIndex={scheduleIndex}
                          draftSchedulesLength={draftSchedules.length}
                          panelBorder={panelBorder}
                          inputBg={inputBg}
                          panelBg={panelBg}
                          mutedText={mutedText}
                          updateDraftSchedule={updateDraftSchedule}
                          removeSchedule={removeSchedule}
                          updateDailyTime={updateDailyTime}
                          addDailyTime={addDailyTime}
                          removeDailyTime={removeDailyTime}
                          updateCustomDate={updateCustomDate}
                          addCustomDate={addCustomDate}
                          removeCustomDate={removeCustomDate}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <FormControl display="flex" alignItems="center" justifyContent="space-between" bg={panelBg} borderRadius="2xl" px={4} py={3}>
                      <FormLabel mb={0}>Desktop reminders</FormLabel>
                      <Switch isChecked={notificationEnabled} onChange={(event) => setNotificationEnabled(event.target.checked)} />
                    </FormControl>
                    <FormControl display="flex" alignItems="center" justifyContent="space-between" bg={panelBg} borderRadius="2xl" px={4} py={3}>
                      <FormLabel mb={0}>Repeat until handled</FormLabel>
                      <Switch isChecked={hardToDismiss} onChange={(event) => setHardToDismiss(event.target.checked)} />
                    </FormControl>
                    <FormControl bg={panelBg} borderRadius="2xl" px={4} py={3}>
                      <FormLabel>Repeat every</FormLabel>
                      <InputGroup>
                        <InputLeftAddon>Minutes</InputLeftAddon>
                        <Input bg={inputBg} type="number" min={1} value={repeatMinutes} onChange={(event) => setRepeatMinutes(event.target.value)} />
                      </InputGroup>
                      <FormHelperText color={mutedText}>Only used when reminders repeat until handled.</FormHelperText>
                    </FormControl>
                  </SimpleGrid>
                </Stack>
              )}
            </Box>

            <Box bg={modeGradient} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
              <Text fontSize="sm" color={mutedText}>
                Preview
              </Text>
              <Heading size="sm" mt={2}>
                {title || 'Untitled item'}
              </Heading>
              <Text mt={1} color={mutedText}>
                {getCategoryLabel(category)}
              </Text>
              <Text mt={3} fontSize="sm" color={mutedText}>
                {summarizeSchedule(previewItem)}
              </Text>
            </Box>

            <HStack spacing={3} flexWrap="wrap">
              <Button colorScheme="leaf" onClick={() => void onSaveItem()}>
                {editingItemId ? 'Save changes' : 'Save item'}
              </Button>
              {editingItemId && (
                <Button variant="outline" onClick={onCancelEditing}>
                  Cancel editing
                </Button>
              )}
            </HStack>
          </Stack>
        </Box>
      </GridItem>

      <GridItem>
        <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow} h="100%">
          <Heading size="md" mb={3}>
            Existing items
          </Heading>
          <Stack spacing={3}>
            {items.map((item) => (
              <Box key={item.id} border="1px solid" borderColor={panelBorder} borderRadius="2xl" p={4} bg={panelBg}>
                <HStack justify="space-between" align="start">
                  <Box>
                    <Text fontWeight="semibold">{item.title}</Text>
                    <Text color={mutedText} fontSize="sm">
                      {summarizeSchedule(item)}
                    </Text>
                  </Box>
                  <Stack align="end" spacing={2}>
                    <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                      {getCategoryLabel(item.category)}
                    </Badge>
                    <Button
                      size="xs"
                      variant="outline"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => onEditItem(item)}
                    >
                      Edit
                    </Button>
                  </Stack>
                </HStack>
              </Box>
            ))}
            {items.length === 0 && <Text color={mutedText}>No tracked items configured yet.</Text>}
          </Stack>
        </Box>
      </GridItem>
    </Grid>
  );
}

function RecurringQuickEditor({
  draft,
  inputBg,
  panelBg,
  panelBorder,
  mutedText,
  updateDraftSchedule,
}: {
  draft: DraftSchedule | undefined;
  inputBg: string;
  panelBg: string;
  panelBorder: string;
  mutedText: string;
  updateDraftSchedule: (index: number, mutator: (current: DraftSchedule) => DraftSchedule) => void;
}) {
  const activeKind = draft?.kind === 'ONE_TIME' || draft?.kind === 'CUSTOM_DATES' ? 'DAILY' : draft?.kind ?? 'DAILY';

  return (
    <Stack spacing={4}>
      <FormControl>
        <FormLabel>Recurring cadence</FormLabel>
        <RadioGroup
          value={activeKind}
          onChange={(value) =>
            updateDraftSchedule(0, (current) => ({
              ...current,
              kind: value as SingleScheduleKind,
            }))
          }
        >
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
            {scheduleKindOptions
              .filter((option) => option.value !== 'CUSTOM_DATES' && option.value !== 'ONE_TIME')
              .map((option) => (
                <Box
                  key={option.value}
                  as="label"
                  bg={activeKind === option.value ? panelBg : 'transparent'}
                  border="1px solid"
                  borderColor={activeKind === option.value ? 'leaf.500' : panelBorder}
                  borderRadius="xl"
                  px={4}
                  py={4}
                  cursor="pointer"
                >
                  <Stack align="start" spacing={1}>
                    <Radio value={option.value} colorScheme="leaf">
                      {option.label}
                    </Radio>
                    <Text color={mutedText} fontSize="sm" pl={6}>
                      {option.help}
                    </Text>
                  </Stack>
                </Box>
              ))}
          </SimpleGrid>
        </RadioGroup>
      </FormControl>

      {activeKind === 'DAILY' && (
        <FormControl>
          <FormLabel>Time of day</FormLabel>
          <Input
            bg={inputBg}
            type="time"
            value={draft?.dailyTimes[0] ?? '09:00'}
            onChange={(event) =>
              updateDraftSchedule(0, (current) => ({
                ...current,
                kind: 'DAILY',
                dailyTimes: [event.target.value],
              }))
            }
          />
        </FormControl>
      )}

      {activeKind === 'WEEKLY' && (
        <FormControl>
          <FormLabel>Days of the week</FormLabel>
          <CheckboxGroup
            value={(draft?.weekdays ?? []).map(String)}
            onChange={(values) =>
              updateDraftSchedule(0, (current) => ({
                ...current,
                kind: 'WEEKLY',
                weekdays: values.map((value) => Number(value)),
              }))
            }
          >
            <SimpleGrid columns={{ base: 3, md: 4 }} spacing={2}>
              {weekdayOptions.map((option) => (
                <Checkbox key={option.value} value={String(option.value)}>
                  {option.label}
                </Checkbox>
              ))}
            </SimpleGrid>
          </CheckboxGroup>
        </FormControl>
      )}

      {activeKind === 'INTERVAL_DAYS' && (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl>
            <FormLabel>Repeat every</FormLabel>
            <Input
              bg={inputBg}
              type="number"
              min={1}
              value={draft?.intervalDays ?? '2'}
              onChange={(event) =>
                updateDraftSchedule(0, (current) => ({
                  ...current,
                  kind: 'INTERVAL_DAYS',
                  intervalDays: event.target.value,
                }))
              }
            />
            <FormHelperText color={mutedText}>days</FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel>Start from</FormLabel>
            <Input
              bg={inputBg}
              type="datetime-local"
              value={draft?.intervalAnchor ?? toInputDateTime(new Date())}
              onChange={(event) =>
                updateDraftSchedule(0, (current) => ({
                  ...current,
                  kind: 'INTERVAL_DAYS',
                  intervalAnchor: event.target.value,
                }))
              }
            />
          </FormControl>
        </SimpleGrid>
      )}
    </Stack>
  );
}

function ScheduleEditor({
  draft,
  scheduleIndex,
  draftSchedulesLength,
  panelBorder,
  inputBg,
  panelBg,
  mutedText,
  updateDraftSchedule,
  removeSchedule,
  updateDailyTime,
  addDailyTime,
  removeDailyTime,
  updateCustomDate,
  addCustomDate,
  removeCustomDate,
}: {
  draft: DraftSchedule;
  scheduleIndex: number;
  draftSchedulesLength: number;
  panelBorder: string;
  inputBg: string;
  panelBg: string;
  mutedText: string;
  updateDraftSchedule: (index: number, mutator: (current: DraftSchedule) => DraftSchedule) => void;
  removeSchedule: (index: number) => void;
  updateDailyTime: (scheduleIndex: number, timeIndex: number, value: string) => void;
  addDailyTime: (scheduleIndex: number) => void;
  removeDailyTime: (scheduleIndex: number, timeIndex: number) => void;
  updateCustomDate: (scheduleIndex: number, dateIndex: number, value: string) => void;
  addCustomDate: (scheduleIndex: number) => void;
  removeCustomDate: (scheduleIndex: number, dateIndex: number) => void;
}) {
  return (
    <Box border="1px solid" borderColor={panelBorder} borderRadius="2xl" p={4}>
      <Stack spacing={3}>
        <HStack justify="space-between" align="center">
          <Badge colorScheme={scheduleIndex % 2 === 0 ? 'green' : 'orange'} borderRadius="full" px={3} py={1}>
            Schedule {scheduleIndex + 1}
          </Badge>
          <Button size="xs" variant="ghost" onClick={() => removeSchedule(scheduleIndex)} isDisabled={draftSchedulesLength === 1}>
            Remove
          </Button>
        </HStack>
        <FormControl>
          <FormLabel>Schedule label (optional)</FormLabel>
          <Input
            bg={inputBg}
            placeholder="Morning, Evening, School Days..."
            value={draft.label}
            onChange={(event) => updateDraftSchedule(scheduleIndex, (current) => ({ ...current, label: event.target.value }))}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Cadence</FormLabel>
          <RadioGroup
            value={draft.kind}
            onChange={(value) =>
              updateDraftSchedule(scheduleIndex, (current) => ({ ...current, kind: value as SingleScheduleKind }))
            }
          >
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {scheduleKindOptions.map((option) => (
                <Box
                  key={option.value}
                  as="label"
                  bg={draft.kind === option.value ? panelBg : 'transparent'}
                  border="1px solid"
                  borderColor={draft.kind === option.value ? 'leaf.500' : panelBorder}
                  borderRadius="xl"
                  px={4}
                  py={4}
                  cursor="pointer"
                >
                  <Stack align="start" spacing={1}>
                    <Radio value={option.value} colorScheme="leaf">
                      {option.label}
                    </Radio>
                    <Text color={mutedText} fontSize="sm" pl={6}>
                      {option.help}
                    </Text>
                  </Stack>
                </Box>
              ))}
            </SimpleGrid>
          </RadioGroup>
        </FormControl>

        {draft.kind === 'ONE_TIME' && (
          <FormControl>
            <FormLabel>When should it happen?</FormLabel>
            <Input
              bg={inputBg}
              type="datetime-local"
              value={draft.oneTimeAt}
              onChange={(event) => updateDraftSchedule(scheduleIndex, (current) => ({ ...current, oneTimeAt: event.target.value }))}
            />
          </FormControl>
        )}

        {draft.kind === 'DAILY' && (
          <FormControl>
            <FormLabel>Times of day</FormLabel>
            <Stack spacing={2}>
              {draft.dailyTimes.map((time, timeIndex) => (
                <HStack key={`daily-${scheduleIndex}-${timeIndex}`}>
                  <Input bg={inputBg} type="time" value={time} onChange={(event) => updateDailyTime(scheduleIndex, timeIndex, event.target.value)} />
                  <Button size="sm" variant="ghost" onClick={() => removeDailyTime(scheduleIndex, timeIndex)} isDisabled={draft.dailyTimes.length === 1}>
                    Remove
                  </Button>
                </HStack>
              ))}
              <Button size="sm" variant="outline" alignSelf="start" onClick={() => addDailyTime(scheduleIndex)}>
                Add time
              </Button>
            </Stack>
          </FormControl>
        )}

        {draft.kind === 'WEEKLY' && (
          <FormControl>
            <FormLabel>Days of the week</FormLabel>
            <CheckboxGroup
              value={draft.weekdays.map(String)}
              onChange={(values) =>
                updateDraftSchedule(scheduleIndex, (current) => ({
                  ...current,
                  weekdays: values.map((value) => Number(value)),
                }))
              }
            >
              <SimpleGrid columns={{ base: 3, md: 4 }} spacing={2}>
                {weekdayOptions.map((option) => (
                  <Checkbox key={option.value} value={String(option.value)}>
                    {option.label}
                  </Checkbox>
                ))}
              </SimpleGrid>
            </CheckboxGroup>
          </FormControl>
        )}

        {draft.kind === 'INTERVAL_DAYS' && (
          <>
            <FormControl>
              <FormLabel>Repeat every</FormLabel>
              <Input
                bg={inputBg}
                type="number"
                min={1}
                value={draft.intervalDays}
                onChange={(event) => updateDraftSchedule(scheduleIndex, (current) => ({ ...current, intervalDays: event.target.value }))}
              />
              <FormHelperText color={mutedText}>days</FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel>Start counting from</FormLabel>
              <Input
                bg={inputBg}
                type="datetime-local"
                value={draft.intervalAnchor}
                onChange={(event) => updateDraftSchedule(scheduleIndex, (current) => ({ ...current, intervalAnchor: event.target.value }))}
              />
            </FormControl>
          </>
        )}

        {draft.kind === 'CUSTOM_DATES' && (
          <FormControl>
            <FormLabel>Chosen dates</FormLabel>
            <Stack spacing={2}>
              <Box className="leaf-calendar" border="1px solid" borderColor={panelBorder} borderRadius="xl" p={2} bg={panelBg}>
                <DayPicker
                  mode="multiple"
                  selected={draft.customDates.map((entry) => new Date(entry)).filter((entry) => !Number.isNaN(entry.valueOf()))}
                  onSelect={(selectedDates) => {
                    const nextDates =
                      selectedDates?.map((entry) => {
                        const withTime = new Date(entry);
                        withTime.setHours(9, 0, 0, 0);
                        return toInputDateTime(withTime);
                      }) ?? [''];
                    updateDraftSchedule(scheduleIndex, (current) => ({
                      ...current,
                      customDates: nextDates.length > 0 ? nextDates : [''],
                    }));
                  }}
                />
              </Box>
              {draft.customDates.map((dateValue, dateIndex) => (
                <HStack key={`custom-${scheduleIndex}-${dateIndex}`}>
                  <Input bg={inputBg} type="datetime-local" value={dateValue} onChange={(event) => updateCustomDate(scheduleIndex, dateIndex, event.target.value)} />
                  <Button size="sm" variant="ghost" onClick={() => removeCustomDate(scheduleIndex, dateIndex)} isDisabled={draft.customDates.length === 1}>
                    Remove
                  </Button>
                </HStack>
              ))}
              <Button size="sm" variant="outline" alignSelf="start" onClick={() => addCustomDate(scheduleIndex)}>
                Add date
              </Button>
            </Stack>
          </FormControl>
        )}
      </Stack>
    </Box>
  );
}
