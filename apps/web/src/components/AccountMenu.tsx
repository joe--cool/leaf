import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import {
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Portal,
  Text,
} from '@chakra-ui/react';
import type { CSSProperties, ReactElement } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export function AccountMenu({
  userName,
  userEmail,
  avatarUrl,
  accountButtonBg,
  accountButtonBorder,
  accountIconColor,
  accountMenuBg,
  accountMenuBorder,
  accountMenuHoverBg,
  accountMenuDivider,
  isAdmin,
  colorMode,
  onToggleColorMode,
  onSignOut,
  userGlyph,
}: {
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  accountButtonBg: string;
  accountButtonBorder: string;
  accountIconColor: string;
  accountMenuBg: string;
  accountMenuBorder: string;
  accountMenuHoverBg: string;
  accountMenuDivider: string;
  isAdmin: boolean;
  colorMode: 'light' | 'dark';
  onToggleColorMode: () => void;
  onSignOut: () => void;
  userGlyph: ReactElement;
}) {
  return (
    <Menu placement="bottom-end" autoSelect={false}>
      <MenuButton
        as={IconButton}
        aria-label="Open account menu"
        variant="ghost"
        borderRadius="full"
        bg={accountButtonBg}
        border="1px solid"
        borderColor={accountButtonBorder}
        boxShadow="0 10px 24px rgba(0, 0, 0, 0.06)"
        _hover={{ bg: accountButtonBg, borderColor: accountButtonBorder }}
        _active={{ bg: accountButtonBg }}
        icon={
          <Avatar
            size="sm"
            name={userName || userEmail}
            src={avatarUrl ?? undefined}
            icon={userGlyph}
            bg={accountButtonBg}
            color={accountIconColor}
          />
        }
      />
      <Portal>
        <MenuList
          data-testid="account-menu"
          borderRadius="2xl"
          p={2}
          bg={accountMenuBg}
          border="1px solid"
          borderColor={accountMenuBorder}
          zIndex={2000}
          boxShadow="0 24px 64px rgba(0, 0, 0, 0.16)"
          style={{ '--account-menu-hover-bg': accountMenuHoverBg } as CSSProperties}
        >
          <Box px={3} py={2}>
            <Text fontWeight="semibold">{userName || userEmail}</Text>
            <Text fontSize="sm" color="inherit">
              {userEmail}
            </Text>
          </Box>
          <MenuDivider borderColor={accountMenuDivider} />
          <MenuItem
            data-testid="account-menu-item-preferences"
            as={RouterLink}
            to="/profile"
            borderRadius="xl"
            bg="transparent"
            color="inherit"
            _hover={{ bg: 'var(--account-menu-hover-bg)' }}
            _focus={{ bg: 'var(--account-menu-hover-bg)' }}
            _active={{ bg: 'var(--account-menu-hover-bg)' }}
          >
            Profile & Relationships
          </MenuItem>
          <MenuItem
            as={RouterLink}
            to="/audit-log"
            borderRadius="xl"
            bg="transparent"
            color="inherit"
            _hover={{ bg: 'var(--account-menu-hover-bg)' }}
            _focus={{ bg: 'var(--account-menu-hover-bg)' }}
            _active={{ bg: 'var(--account-menu-hover-bg)' }}
          >
            Audit Log
          </MenuItem>
          {isAdmin && (
            <MenuItem
              as={RouterLink}
              to="/admin"
              borderRadius="xl"
              bg="transparent"
              color="inherit"
              _hover={{ bg: 'var(--account-menu-hover-bg)' }}
              _focus={{ bg: 'var(--account-menu-hover-bg)' }}
              _active={{ bg: 'var(--account-menu-hover-bg)' }}
            >
              Admin
            </MenuItem>
          )}
          <MenuItem
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={onToggleColorMode}
            borderRadius="xl"
            bg="transparent"
            color="inherit"
            _hover={{ bg: 'var(--account-menu-hover-bg)' }}
            _focus={{ bg: 'var(--account-menu-hover-bg)' }}
            _active={{ bg: 'var(--account-menu-hover-bg)' }}
          >
            {colorMode === 'light' ? 'Dark mode' : 'Light mode'}
          </MenuItem>
          <MenuDivider borderColor={accountMenuDivider} />
          <MenuItem
            onClick={onSignOut}
            borderRadius="xl"
            bg="transparent"
            color="inherit"
            _hover={{ bg: 'var(--account-menu-hover-bg)' }}
            _focus={{ bg: 'var(--account-menu-hover-bg)' }}
            _active={{ bg: 'var(--account-menu-hover-bg)' }}
          >
            Sign out
          </MenuItem>
        </MenuList>
      </Portal>
    </Menu>
  );
}
