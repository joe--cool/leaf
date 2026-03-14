import { Button, Stack, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { accountNavItems, appNavItems } from '../appConstants';
import type { PageKey } from '../appTypes';
import { NavButton } from './NavButton';

export function SidebarNav({
  accountMode,
  subtleText,
  isAdmin,
  currentPage,
  accent,
  canReviewOthers,
}: {
  accountMode: boolean;
  subtleText: string;
  isAdmin: boolean;
  currentPage: PageKey;
  accent: string;
  canReviewOthers: boolean;
}) {
  if (accountMode) {
    return (
      <Stack spacing={4}>
        <Button
          as={RouterLink}
          to="/dashboard"
          justifyContent="flex-start"
          variant="ghost"
          borderRadius="2xl"
          px={4}
          py={3}
        >
          Back to app
        </Button>
        <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText} px={2}>
          Account
        </Text>
        <Stack spacing={2}>
          {accountNavItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <NavButton
                key={item.key}
                label={item.label}
                to={item.path}
                active={currentPage === item.key}
                accent={accent}
              />
            ))}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={4}>
      <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.16em" color={subtleText} px={2}>
        Navigation
      </Text>
      <Stack spacing={2}>
        {appNavItems
          .concat(canReviewOthers ? [{ key: 'reviewees' as const, path: '/reviewees', label: 'Reviewees' }] : [])
          .map((item) => (
            <NavButton
              key={item.key}
              label={item.label}
              to={item.path}
              active={currentPage === item.key}
              accent={accent}
            />
          ))}
      </Stack>
    </Stack>
  );
}
