import { defaultReflectionWritingPrompt } from '@leaf/shared';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Stack,
  Text,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { RetrospectiveEntry } from '../appTypes';
import { WritingPromptEditorModal } from '../components/WritingPromptEditorModal';

export function RetrospectiveDetailPage({
  entry,
  onUpdateSummary,
  onContribute,
  onUpdatePrompt,
  panelBgStrong,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBg,
}: {
  entry: RetrospectiveEntry | null;
  onUpdateSummary: (id: string, summary: string) => Promise<void>;
  onContribute: (id: string, body: string) => Promise<void>;
  onUpdatePrompt: (targetUserId: string, prompt: string | null) => Promise<void>;
  panelBgStrong: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBg: string;
}) {
  const [draftSummary, setDraftSummary] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [displayedWritingPrompt, setDisplayedWritingPrompt] = useState<string | null | undefined>(undefined);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const promptEditor = useDisclosure();

  useEffect(() => {
    setDraftSummary(entry?.summary ?? '');
    setDraftNote('');
    setDisplayedWritingPrompt(entry?.writingPrompt);
  }, [entry]);

  async function saveSummary() {
    const nextSummary = draftSummary.trim();
    if (!entry || !nextSummary) return;
    setSavingSummary(true);
    try {
      await onUpdateSummary(entry.id, nextSummary);
    } finally {
      setSavingSummary(false);
    }
  }

  async function saveNote() {
    const nextNote = draftNote.trim();
    if (!entry || !nextNote) return;
    setSavingNote(true);
    try {
      await onContribute(entry.id, nextNote);
      setDraftNote('');
    } finally {
      setSavingNote(false);
    }
  }

  if (!entry) {
    return (
      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Heading size="md">Reflection not found</Heading>
        <Text mt={3} color={mutedText}>
          This reflection is not available in your current history.
        </Text>
        <Button as={RouterLink} to="/retrospectives" mt={5} variant="outline">
          Back to Looking Back
        </Button>
      </Box>
    );
  }

  const summaryPlaceholder =
    entry.kind === 'manual' ? 'Capture the current state of this off-cycle reflection.' : 'Capture how this period went.';
  const writingPrompt = displayedWritingPrompt?.trim() || defaultReflectionWritingPrompt;

  return (
    <Stack spacing={5}>
      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Button as={RouterLink} to="/retrospectives" variant="ghost" px={0} mb={4}>
          Back to Looking Back
        </Button>
        <HStackWrap>
          <Badge colorScheme={entry.kind === 'manual' ? 'orange' : 'leaf'} borderRadius="full" px={3} py={1}>
            {entry.kind === 'manual' ? 'Impromptu Reflection' : 'Scheduled Reflection'}
          </Badge>
          <Badge variant="subtle" borderRadius="full" px={3} py={1}>
            {entry.subjectName}
          </Badge>
          <Badge variant="outline" borderRadius="full" px={3} py={1}>
            {formatRange(entry.periodStart, entry.periodEnd)}
          </Badge>
        </HStackWrap>
        <Heading size="lg" mt={4}>
          {entry.title}
        </Heading>
        <Text mt={2} color={mutedText}>
          Created by {entry.createdByName} for {entry.audience}
        </Text>
        <Text mt={2} color={subtleText}>
          {entry.visibility}
        </Text>
      </Box>

      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Grid templateColumns={{ base: '1fr', md: 'minmax(0, 1fr) auto' }} gap={4} alignItems="start">
          <Box>
            <Heading size="md">Writing prompt</Heading>
            <Text mt={3} color={mutedText} whiteSpace="pre-wrap">
              {writingPrompt}
            </Text>
          </Box>
          {entry.canContribute ? (
            <Button variant="outline" onClick={promptEditor.onOpen}>
              Edit Writing Prompt
            </Button>
          ) : null}
        </Grid>
      </Box>

      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Heading size="md" mb={4}>
          Summary
        </Heading>
        {entry.canContribute ? (
          <>
            <Textarea
              aria-label={`Summary for ${entry.title}`}
              bg={panelBg}
              value={draftSummary}
              onChange={(event) => setDraftSummary(event.target.value)}
              minH="180px"
              placeholder={summaryPlaceholder}
              _placeholder={{ color: mutedText }}
            />
            <Flex justify="space-between" align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} mt={4}>
              <Text color={mutedText}>Keep this summary as the current picture of the whole period.</Text>
              <Button colorScheme="clay" onClick={saveSummary} isLoading={savingSummary} isDisabled={!draftSummary.trim()}>
                Save Summary
              </Button>
            </Flex>
          </>
        ) : (
          <Text color={mutedText}>{entry.summary?.trim() || 'No summary has been written yet.'}</Text>
        )}
      </Box>

      <Box bg={panelBgStrong} borderRadius="3xl" p={6} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
        <Heading size="md" mb={4}>
          Reflective notes
        </Heading>
        <Stack spacing={3}>
          {entry.contributions.length === 0 ? (
            <Text color={mutedText}>No reflective notes yet.</Text>
          ) : (
            entry.contributions.map((contribution) => (
              <Box key={contribution.id} bg={panelBg} borderRadius="2xl" p={4}>
                <Text fontWeight="semibold">
                  {contribution.authorName}
                  <Text as="span" fontWeight="normal" color={subtleText}>
                    {' '}
                    · {formatTimestamp(contribution.createdAt)}
                  </Text>
                </Text>
                <Text mt={2} color={mutedText}>
                  {contribution.body}
                </Text>
              </Box>
            ))
          )}
        </Stack>
        {entry.canContribute ? (
          <>
            <FormControl mt={4}>
              <FormLabel>Add reflective note</FormLabel>
              <Textarea
                aria-label={`Add note for ${entry.title}`}
                bg={panelBg}
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                minH="120px"
                placeholder="Add a reflective note without changing the main summary."
                _placeholder={{ color: mutedText }}
              />
            </FormControl>
            <Button colorScheme="clay" mt={4} onClick={saveNote} isLoading={savingNote} isDisabled={!draftNote.trim()}>
              Save Note
            </Button>
          </>
        ) : null}
      </Box>

      <WritingPromptEditorModal
        isOpen={promptEditor.isOpen}
        onClose={promptEditor.onClose}
        subjectName={entry.subjectName}
        currentPrompt={displayedWritingPrompt}
        fallbackPrompt={defaultReflectionWritingPrompt}
        onSave={async (prompt) => {
          await onUpdatePrompt(entry.subjectUserId, prompt);
          setDisplayedWritingPrompt(prompt);
        }}
        panelBgStrong={panelBgStrong}
        panelBorder={panelBorder}
        mutedText={mutedText}
        inputBg={panelBg}
      />
    </Stack>
  );
}

function HStackWrap({ children }: { children: React.ReactNode }) {
  return (
    <Flex gap={2} wrap="wrap">
      {children}
    </Flex>
  );
}

function formatRange(periodStart: string, periodEnd: string) {
  const start = new Date(periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `${start} to ${end}`;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
