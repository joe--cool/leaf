import { Box, Button, Heading, HStack, Text } from '@chakra-ui/react';

export function SessionErrorPanel({
  panelBgStrong,
  statGlow,
  panelBorder,
  mutedText,
  sessionLoadError,
  onRetry,
  onSignOut,
}: {
  panelBgStrong: string;
  statGlow: string;
  panelBorder: string;
  mutedText: string;
  sessionLoadError: string | null;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <Box
      bg={panelBgStrong}
      borderRadius="3xl"
      p={6}
      boxShadow={statGlow}
      border="1px solid"
      borderColor={panelBorder}
    >
      <Heading size="md" mb={2}>
        Session needs attention
      </Heading>
      <Text color={mutedText} mb={4}>
        We could not load your account data. This can happen with an expired token,
        incorrect API URL, or a temporary connection issue.
      </Text>
      {sessionLoadError && (
        <Text fontSize="sm" color="red.400" mb={4}>
          {sessionLoadError}
        </Text>
      )}
      <HStack>
        <Button onClick={onRetry}>Retry</Button>
        <Button variant="outline" onClick={onSignOut}>
          Sign out
        </Button>
      </HStack>
    </Box>
  );
}
