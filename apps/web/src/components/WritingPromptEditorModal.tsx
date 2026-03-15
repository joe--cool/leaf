import {
  Button,
  FormControl,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';

export function WritingPromptEditorModal({
  isOpen,
  onClose,
  subjectName,
  currentPrompt,
  fallbackPrompt,
  onSave,
  panelBgStrong,
  panelBorder,
  mutedText,
  inputBg,
}: {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  currentPrompt?: string | null;
  fallbackPrompt: string;
  onSave: (prompt: string | null) => Promise<void>;
  panelBgStrong: string;
  panelBorder: string;
  mutedText: string;
  inputBg: string;
}) {
  const [draftPrompt, setDraftPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftPrompt(currentPrompt ?? '');
    }
  }, [currentPrompt, isOpen]);

  async function savePrompt() {
    setIsSaving(true);
    try {
      await onSave(draftPrompt.trim() || null);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay bg="rgba(18, 24, 24, 0.42)" backdropFilter="blur(8px)" />
      <ModalContent bg={panelBgStrong} border="1px solid" borderColor={panelBorder} borderRadius="3xl">
        <ModalHeader>Edit Writing Prompt</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel>{subjectName}</FormLabel>
            <Textarea
              aria-label={`Writing prompt for ${subjectName}`}
              bg={inputBg}
              borderColor={panelBorder}
              value={draftPrompt}
              onChange={(event) => setDraftPrompt(event.target.value)}
              minH="180px"
              placeholder={fallbackPrompt}
              _placeholder={{ color: mutedText }}
            />
          </FormControl>
          <Text mt={3} color={mutedText} fontSize="sm">
            Leave this blank to use the system default prompt.
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="clay" onClick={savePrompt} isLoading={isSaving}>
            Save Prompt
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
