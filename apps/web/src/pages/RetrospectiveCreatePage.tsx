import { defaultReflectionWritingPrompt } from '@leaf/shared';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import type { RetrospectiveDraftKind, RetrospectiveEntry, RetrospectiveSubjectOption } from '../appTypes';
import { WritingPromptEditorModal } from '../components/WritingPromptEditorModal';
import { cadenceLabel, cadenceWindowForDate } from '../reflectionUtils';

type DraftValues = {
  subjectUserId: string;
  kind: RetrospectiveDraftKind;
};

export function RetrospectiveCreatePage({
  subjects,
  initialDraft,
  onCreate,
  onUpdatePrompt,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  inputBg,
}: {
  subjects: RetrospectiveSubjectOption[];
  initialDraft: DraftValues;
  onCreate: (payload: {
    subjectUserId: string;
    kind: RetrospectiveDraftKind;
    periodStart: string;
    periodEnd: string;
    promptPreset: 'weekly-review' | 'reset-and-obstacles';
    title: string;
    summary: string;
  }) => Promise<RetrospectiveEntry>;
  onUpdatePrompt: (targetUserId: string, prompt: string | null) => Promise<void>;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  inputBg: string;
}) {
  const navigate = useNavigate();
  const [subjectUserId, setSubjectUserId] = useState(initialDraft.subjectUserId);
  const [summary, setSummary] = useState('');
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(undefined);
  const [displayedWritingPrompt, setDisplayedWritingPrompt] = useState<string | null | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const promptEditor = useDisclosure();
  const rangePicker = useDisclosure();

  useEffect(() => {
    setSubjectUserId(initialDraft.subjectUserId);
  }, [initialDraft.subjectUserId]);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectUserId) ?? subjects[0] ?? null,
    [subjectUserId, subjects],
  );
  const cadence = selectedSubject?.cadence ?? 'weekly';
  const defaultWindow = useMemo(
    () => cadenceWindowForDate(initialDraft.kind === 'scheduled' ? cadence : 'weekly'),
    [cadence, initialDraft.kind],
  );
  const defaultTitle =
    selectedSubject === null
      ? ''
      : initialDraft.kind === 'scheduled'
        ? `${cadenceLabel(cadence)} · ${selectedSubject.name}`
        : `Impromptu Reflection · ${selectedSubject.name}`;
  const defaultSummary =
    initialDraft.kind === 'scheduled'
      ? 'Capture how this period went.'
      : 'Capture the current state of this off-cycle reflection.';
  const writingPrompt = displayedWritingPrompt?.trim() || defaultReflectionWritingPrompt;
  const isManual = initialDraft.kind === 'manual';
  const subjectDisplayName = selectedSubject?.label === 'My account' ? 'Myself' : selectedSubject?.name ?? 'this member';
  const pageTitle = initialDraft.kind === 'scheduled' ? `Scheduled Look Back for ${subjectDisplayName}` : `Impromptu Reflection for ${subjectDisplayName}`;

  useEffect(() => {
    setSummary('');
  }, [defaultSummary, subjectUserId]);

  useEffect(() => {
    setSelectedRange({
      from: parseDateOnly(defaultWindow.start) ?? undefined,
      to: parseDateOnly(addDays(defaultWindow.end, -1)) ?? undefined,
    });
  }, [defaultWindow.end, defaultWindow.start]);

  useEffect(() => {
    setDisplayedWritingPrompt(selectedSubject?.writingPrompt);
  }, [selectedSubject?.id, selectedSubject?.writingPrompt]);

  const computedStart = isManual ? dateToIsoAtUtcStart(selectedRange?.from) : defaultWindow.start;
  const computedEnd = isManual ? dateToExclusiveUtcIso(selectedRange?.to) : defaultWindow.end;
  const rangeIsValid = computedStart !== null && computedEnd !== null && computedEnd > computedStart;
  const draftRangeIsValid =
    dateToIsoAtUtcStart(draftRange?.from) !== null &&
    dateToExclusiveUtcIso(draftRange?.to) !== null &&
    dateToExclusiveUtcIso(draftRange?.to)! > dateToIsoAtUtcStart(draftRange?.from)!;

  function openRangePicker() {
    setDraftRange(selectedRange ? { ...selectedRange } : undefined);
    rangePicker.onOpen();
  }

  function applyRange() {
    if (!draftRangeIsValid) return;
    setSelectedRange(draftRange ? { ...draftRange } : undefined);
    rangePicker.onClose();
  }

  async function createReflection() {
    if (!selectedSubject || computedStart === null || computedEnd === null || !rangeIsValid) return;
    setIsSaving(true);
    try {
      const created = await onCreate({
        subjectUserId: selectedSubject.id,
        kind: initialDraft.kind,
        periodStart: computedStart,
        periodEnd: computedEnd,
        promptPreset: initialDraft.kind === 'scheduled' ? 'weekly-review' : 'reset-and-obstacles',
        title: defaultTitle,
        summary: summary.trim() || defaultSummary,
      });
      navigate(`/retrospectives/${created.id}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Stack spacing={5}>
      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Button as={RouterLink} to="/retrospectives" variant="ghost" px={0} mb={4}>
          Back to Looking Back
        </Button>
        <Heading size="lg">{pageTitle}</Heading>
        <Text mt={3} color={mutedText} maxW="38rem">
          {initialDraft.kind === 'scheduled'
            ? 'This reflection was opened from a due scheduled cadence.'
            : 'This reflection was opened as an impromptu check-in.'}
        </Text>
      </Box>

      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        {selectedSubject ? (
          <Text color={subtleText}>
            {selectedSubject.detail}
          </Text>
        ) : null}

        <Box mt={4}>
          <Heading size="sm">{isManual ? 'Date range' : 'Scheduled period'}</Heading>
          {isManual ? (
            <Stack mt={3} spacing={3} align="start">
              <Text color={mutedText}>
                {selectedRange?.from && selectedRange?.to ? formatManualRange(selectedRange) : 'Choose a start and end date.'}
              </Text>
              <Button variant="outline" borderColor="leaf.300" color="leaf.700" _hover={{ bg: 'leaf.50' }} onClick={openRangePicker}>
                Choose Date Range
              </Button>
            </Stack>
          ) : (
            <Text mt={3} color={mutedText}>
              {formatRange(defaultWindow.start, defaultWindow.end)}
            </Text>
          )}
        </Box>
      </Box>

      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Grid templateColumns={{ base: '1fr', md: 'minmax(0, 1fr) auto' }} gap={4} alignItems="start">
          <Box>
            <Heading size="md">Writing prompt</Heading>
            <Text mt={3} color={mutedText} whiteSpace="pre-wrap">
              {writingPrompt}
            </Text>
          </Box>
          {selectedSubject ? (
            <Button variant="outline" onClick={promptEditor.onOpen}>
              Edit Writing Prompt
            </Button>
          ) : null}
        </Grid>
      </Box>

      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <FormControl>
          <FormLabel>Summary</FormLabel>
          <Textarea
            aria-label="Reflection summary"
            bg={inputBg}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            minH="180px"
            placeholder={defaultSummary}
            _placeholder={{ color: mutedText }}
          />
        </FormControl>

        {isManual && !rangeIsValid ? (
          <Text mt={3} color="red.500" fontSize="sm">
            Choose an end date after the start date.
          </Text>
        ) : null}

        <Button mt={5} colorScheme="clay" onClick={createReflection} isLoading={isSaving} isDisabled={!selectedSubject || !rangeIsValid}>
          Create Reflection
        </Button>
      </Box>

      {selectedSubject ? (
        <WritingPromptEditorModal
          isOpen={promptEditor.isOpen}
          onClose={promptEditor.onClose}
          subjectName={selectedSubject.name}
          currentPrompt={displayedWritingPrompt}
          fallbackPrompt={defaultReflectionWritingPrompt}
          onSave={async (prompt) => {
            await onUpdatePrompt(selectedSubject.id, prompt);
            setDisplayedWritingPrompt(prompt);
          }}
          panelBgStrong={panelBgStrong}
          panelBorder={panelBorder}
          mutedText={mutedText}
          inputBg={inputBg}
        />
      ) : null}

      <Modal isOpen={rangePicker.isOpen} onClose={rangePicker.onClose} size="lg">
        <ModalOverlay bg="rgba(18, 24, 24, 0.42)" backdropFilter="blur(8px)" />
        <ModalContent bg={panelBgStrong} border="1px solid" borderColor={panelBorder} borderRadius="3xl">
          <ModalHeader>Choose Date Range</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color={mutedText} mb={4}>
              Pick the window this impromptu reflection should cover.
            </Text>
            <Box className="leaf-calendar leaf-calendar-popup" border="1px solid" borderColor={panelBorder} borderRadius="2xl" p={3}>
              <DayPicker mode="range" selected={draftRange} onSelect={setDraftRange} numberOfMonths={2} />
            </Box>
            <Text mt={4} color={mutedText}>
              {draftRange?.from && draftRange?.to ? formatManualRange(draftRange) : 'Choose both a start date and an end date.'}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={rangePicker.onClose}>
              Close
            </Button>
            <Button colorScheme="clay" onClick={applyRange} isDisabled={!draftRangeIsValid}>
              Use Range
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}

function addDays(value: string, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function formatRange(periodStart: string, periodEnd: string) {
  const start = new Date(periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${start} to ${end}`;
}

function parseDateOnly(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function dateToIsoAtUtcStart(value?: Date) {
  if (!value) return null;
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())).toISOString();
}

function dateToExclusiveUtcIso(value?: Date) {
  const start = dateToIsoAtUtcStart(value);
  if (!start) return null;
  return addDays(start, 1);
}

function formatManualRange(value: DateRange) {
  if (!value.from || !value.to) return 'Choose a start and end date.';
  const start = value.from.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const end = value.to.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} to ${end}`;
}
