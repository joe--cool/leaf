import { Button, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

export function NavButton({
  label,
  to,
  active,
  accent,
}: {
  label: string;
  to: string;
  active: boolean;
  accent: string;
}) {
  const activeBg = accent === 'clay' ? 'clay.500' : 'leaf.500';
  const activeShadow =
    accent === 'clay'
      ? '0 18px 36px rgba(163, 88, 54, 0.24)'
      : '0 18px 36px rgba(79, 118, 88, 0.22)';

  return (
    <Button
      as={RouterLink}
      to={to}
      justifyContent="flex-start"
      h="auto"
      py={3}
      px={4}
      variant="ghost"
      borderRadius="2xl"
      bg={active ? activeBg : 'transparent'}
      color={active ? 'white' : 'inherit'}
      boxShadow={active ? activeShadow : 'none'}
      _hover={{ bg: active ? activeBg : 'blackAlpha.100', transform: 'translateX(2px)' }}
      _dark={{ _hover: { bg: active ? activeBg : 'whiteAlpha.140' } }}
      transition="0.18s ease"
    >
      <Stack spacing={0.5} align="start">
        <Text fontWeight="semibold">{label}</Text>
      </Stack>
    </Button>
  );
}
