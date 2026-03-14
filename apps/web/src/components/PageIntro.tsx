import { Box, Flex, Heading, Text } from '@chakra-ui/react';

export function PageIntro({
  eyebrow,
  title,
  summary,
  subtleText,
  mutedText,
  currentPage,
  panelBgStrong,
  panelBorder,
  digestSummary,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  subtleText: string;
  mutedText: string;
  currentPage: string;
  panelBgStrong: string;
  panelBorder: string;
  digestSummary: string;
}) {
  return (
    <Flex
      justify="space-between"
      align={{ base: 'start', md: 'center' }}
      direction={{ base: 'column', md: 'row' }}
      gap={4}
    >
      <Box>
        <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
          {eyebrow}
        </Text>
        <Heading size="lg" mt={2}>
          {title}
        </Heading>
        <Text mt={2} color={mutedText} maxW="40rem">
          {summary}
        </Text>
      </Box>
      {currentPage === 'dashboard' && (
        <Box
          bg={panelBgStrong}
          borderRadius="2xl"
          px={4}
          py={3}
          border="1px solid"
          borderColor={panelBorder}
          minW={{ md: '220px' }}
        >
          <Text fontSize="sm" color={mutedText}>
            Weekly digest
          </Text>
          <Text mt={1} fontWeight="semibold">
            {digestSummary}
          </Text>
        </Box>
      )}
    </Flex>
  );
}
