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
  Radio,
  RadioGroup,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  useToast,
} from '@chakra-ui/react';
import { DayPicker } from 'react-day-picker';
import { categoryOptions, scheduleKindOptions, weekdayOptions } from '../appConstants';
import { getCategoryLabel, getDefaultTitle, summarizeSchedule, toInputDateTime } from '../scheduleUtils';
import type { DraftSchedule, Item, SingleScheduleKind } from '../appTypes';

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
  onAddItem,
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
  onAddItem: () => Promise<void>;
  items: Item[];
}) {
  const toast = useToast();

  return (
    <Grid templateColumns={{ base: '1fr', xl: '1.08fr 0.92fr' }} gap={5}>
      <GridItem>
        <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
          <Heading size="md" mb={3}>
            Routine Builder
          </Heading>
          <Stack spacing={4}>
            <Box bg={sectionBg} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
              <Text fontWeight="semibold" mb={1}>
                1. Name the routine
              </Text>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Routine name</FormLabel>
                  <Input
                    bg={inputBg}
                    placeholder={getDefaultTitle(category)}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Type of routine</FormLabel>
                  <RadioGroup value={category} onChange={onCategoryChange}>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                      {categoryOptions.map((option) => (
                        <Box
                          key={option.value}
                          as="label"
                          bg={panelBg}
                          border="1px solid"
                          borderColor={category === option.value ? 'leaf.500' : panelBorder}
                          borderRadius="xl"
                          px={4}
                          py={3}
                          cursor="pointer"
                        >
                          <Radio value={option.value} colorScheme="leaf">
                            {option.label}
                          </Radio>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </RadioGroup>
                </FormControl>
              </Stack>
            </Box>

            <Box bg={sectionBg} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
              <HStack justify="space-between" align="center" mb={3}>
                <Box>
                  <Text fontWeight="semibold">2. Set the cadence</Text>
                </Box>
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

            <Box bg={sectionBg} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
              <Text fontWeight="semibold" mb={1}>
                3. Choose reminder behavior
              </Text>
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
                  <Input bg={inputBg} type="number" min={1} value={repeatMinutes} onChange={(event) => setRepeatMinutes(event.target.value)} />
                  <FormHelperText color={mutedText}>minutes</FormHelperText>
                </FormControl>
              </SimpleGrid>
            </Box>

            <Box bg={modeGradient} borderRadius="2xl" p={4} border="1px solid" borderColor={panelBorder}>
              <Text fontSize="sm" color={mutedText}>
                Preview
              </Text>
              <Heading size="sm" mt={2}>
                {title || 'Untitled routine'}
              </Heading>
              <Text mt={1} color={mutedText}>
                {getCategoryLabel(category)}
              </Text>
              <Text mt={3} fontSize="sm" color={mutedText}>
                {draftSchedules.length === 1
                  ? scheduleKindOptions.find((option) => option.value === draftSchedules[0]?.kind)?.label ?? 'Cadence not set'
                  : `${draftSchedules.length} schedules combined`}
              </Text>
            </Box>

            <Button colorScheme="leaf" onClick={() => onAddItem().catch((error) => toast({ status: 'error', title: String(error) }))}>
              Save routine
            </Button>
          </Stack>
        </Box>
      </GridItem>

      <GridItem>
        <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow} h="100%">
          <Heading size="md" mb={3}>
            Existing routines
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
                  <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
                    {getCategoryLabel(item.category)}
                  </Badge>
                </HStack>
              </Box>
            ))}
            {items.length === 0 && <Text color={mutedText}>No routines configured yet.</Text>}
          </Stack>
        </Box>
      </GridItem>
    </Grid>
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
            onChange={(event) =>
              updateDraftSchedule(scheduleIndex, (current) => ({ ...current, kind: event as SingleScheduleKind }))
            }
          >
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {scheduleKindOptions.map((option) => (
                <Box
                  key={option.value}
                  as="label"
                  bg={panelBg}
                  border="1px solid"
                  borderColor={draft.kind === option.value ? 'leaf.500' : panelBorder}
                  borderRadius="xl"
                  px={4}
                  py={3}
                  cursor="pointer"
                >
                  <Stack spacing={1}>
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
                updateDraftSchedule(scheduleIndex, (current) => ({ ...current, weekdays: values.map((value) => Number(value)) }))
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
