import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Image,
  Input,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import type { FormEvent } from 'react';
import type { OAuthProvider } from '../appTypes';

export function AuthPage({
  needsSetup,
  heroGradient,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBgStrong,
  inputBg,
  setupEmail,
  setSetupEmail,
  setupName,
  setSetupName,
  setupPassword,
  setSetupPassword,
  setupToken,
  setSetupToken,
  setupDemoMode,
  setSetupDemoMode,
  email,
  setEmail,
  password,
  setPassword,
  oauthProviders,
  onRunSetup,
  onLogin,
  onLoginWithProvider,
}: {
  needsSetup: boolean;
  heroGradient: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBgStrong: string;
  inputBg: string;
  setupEmail: string;
  setSetupEmail: (value: string) => void;
  setupName: string;
  setSetupName: (value: string) => void;
  setupPassword: string;
  setSetupPassword: (value: string) => void;
  setupToken: string;
  setSetupToken: (value: string) => void;
  setupDemoMode: boolean;
  setSetupDemoMode: (value: boolean) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  oauthProviders: OAuthProvider[];
  onRunSetup: () => Promise<void>;
  onLogin: () => Promise<void>;
  onLoginWithProvider: (provider: OAuthProvider) => Promise<void>;
}) {
  const toast = useToast();

  return (
    <Grid templateColumns={{ base: '1fr', xl: '1.1fr 0.9fr' }} gap={6}>
      <GridItem>
        <Box
          bgGradient={heroGradient}
          borderRadius="3xl"
          p={{ base: 6, md: 8 }}
          border="1px solid"
          borderColor={panelBorder}
          boxShadow={statGlow}
          overflow="hidden"
          position="relative"
        >
          <Box position="absolute" top="-10" right="-10" w="180px" h="180px" borderRadius="full" bg="whiteAlpha.200" />
          <Stack spacing={6} position="relative">
            <HStack spacing={4}>
              <Image src="/leaf.svg" alt="leaf logo" boxSize="46px" />
              <Box>
                <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.16em" color={subtleText}>
                  leaf
                </Text>
                <Heading size="md" mt={2}>
                  Sign in and keep moving.
                </Heading>
              </Box>
            </HStack>

            <Box>
              <Heading size="2xl" lineHeight="1.05" maxW="16ch">
                Clear routines, shared accountability, no extra noise.
              </Heading>
              <Text mt={4} maxW="34rem" color={mutedText}>
                The dashboard should answer what matters now, not explain itself.
              </Text>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              {[
                ['Routines', 'One-time, repeating, and custom schedules live in one system.'],
                ['People', 'Reviewers and digests stay tied to the routines they support.'],
                ['Clarity', 'The interface favors status and actions over description.'],
              ].map(([title, body]) => (
                <Box key={title} bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.90' }} borderRadius="2xl" p={4}>
                  <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.12em" color={subtleText}>
                    {title}
                  </Text>
                  <Text mt={2} fontWeight="semibold">
                    {body}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Stack>
        </Box>
      </GridItem>

      <GridItem>
        <Box bg={panelBgStrong} borderRadius="3xl" p={{ base: 5, md: 6 }} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
          {needsSetup ? (
            <Box
              as="form"
              name="workspace-setup"
              autoComplete="on"
              onSubmit={(event: FormEvent<HTMLDivElement>) => {
                event.preventDefault();
                onRunSetup().catch((error) => toast({ status: 'error', title: String(error) }));
              }}
            >
              <Stack spacing={4}>
                <Badge alignSelf="start" colorScheme="orange" borderRadius="full" px={3} py={1}>
                  Workspace setup
                </Badge>
                <Heading size="lg">Create your workspace</Heading>
                <Text color={mutedText}>
                  Start with one account, decide whether to seed a realistic demo, then invite people into explicit
                  relationships after you land inside.
                </Text>
                <FormControl id="setup-name">
                  <FormLabel>Your name</FormLabel>
                  <Input
                    bg={inputBg}
                    id="setup-name"
                    name="name"
                    autoComplete="name"
                    value={setupName}
                    onChange={(event) => setSetupName(event.target.value)}
                  />
                </FormControl>
                <FormControl id="setup-email">
                  <FormLabel>Email</FormLabel>
                  <Input
                    bg={inputBg}
                    id="setup-email"
                    type="email"
                    inputMode="email"
                    name="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoComplete="email"
                    value={setupEmail}
                    onChange={(event) => setSetupEmail(event.target.value)}
                  />
                </FormControl>
                <FormControl id="setup-password">
                  <FormLabel>Password</FormLabel>
                  <Input
                    bg={inputBg}
                    id="setup-password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={setupPassword}
                    onChange={(event) => setSetupPassword(event.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Setup token (optional)</FormLabel>
                  <Input bg={inputBg} value={setupToken} onChange={(event) => setSetupToken(event.target.value)} />
                  <FormHelperText color={mutedText}>
                    Only needed if your server requires a protected first-run token.
                  </FormHelperText>
                </FormControl>
                <FormControl>
                  <Checkbox isChecked={setupDemoMode} onChange={(event) => setSetupDemoMode(event.target.checked)}>
                    Enable demo mode
                  </Checkbox>
                  <FormHelperText color={mutedText}>
                    Seeds example items, active-guide and passive-guide relationships, and next-step states so the
                    workspace is useful on first sign-in.
                  </FormHelperText>
                </FormControl>
                <Button colorScheme="leaf" type="submit">
                  Create Workspace
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box
              as="form"
              name="login"
              autoComplete="on"
              onSubmit={(event: FormEvent<HTMLDivElement>) => {
                event.preventDefault();
                onLogin().catch((error) => toast({ status: 'error', title: String(error) }));
              }}
            >
              <Stack spacing={4}>
                <Badge alignSelf="start" colorScheme="green" borderRadius="full" px={3} py={1}>
                  Sign in
                </Badge>
                <Heading size="lg">Enter your workspace</Heading>
                <Text color={mutedText}>Use your email and password to continue.</Text>
                <FormControl id="login-email">
                  <FormLabel>Email</FormLabel>
                  <Input
                    bg={inputBg}
                    id="login-email"
                    type="email"
                    inputMode="email"
                    name="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </FormControl>
                <FormControl id="login-password">
                  <FormLabel>Password</FormLabel>
                  <Input
                    bg={inputBg}
                    id="login-password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </FormControl>
                <Button colorScheme="leaf" type="submit">
                  Sign in
                </Button>
                {oauthProviders.length > 0 && (
                  <>
                    <Divider />
                    <Text color={mutedText}>Or continue with another sign-in method</Text>
                    <Stack spacing={2}>
                      {oauthProviders.map((provider) => (
                        <Button
                          key={provider}
                          variant="outline"
                          onClick={() =>
                            onLoginWithProvider(provider).catch((error) =>
                              toast({ status: 'error', title: String(error) }),
                            )
                          }
                        >
                          Continue with {provider[0]!.toUpperCase() + provider.slice(1)}
                        </Button>
                      ))}
                    </Stack>
                  </>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      </GridItem>
    </Grid>
  );
}
