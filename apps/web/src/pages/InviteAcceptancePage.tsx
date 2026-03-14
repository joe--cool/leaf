import {
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import type { FormEvent } from 'react';
import type { InvitePreview, OAuthProvider } from '../appTypes';
import { relationshipTemplateFromProposal } from '../relationshipTemplates';

export function InviteAcceptancePage({
  invite,
  heroGradient,
  panelBorder,
  statGlow,
  subtleText,
  mutedText,
  panelBgStrong,
  inputBg,
  registerName,
  setRegisterName,
  registerEmail,
  setRegisterEmail,
  registerPassword,
  setRegisterPassword,
  email,
  setEmail,
  password,
  setPassword,
  oauthProviders,
  onRegister,
  onLogin,
  onLoginWithProvider,
}: {
  invite: InvitePreview;
  heroGradient: string;
  panelBorder: string;
  statGlow: string;
  subtleText: string;
  mutedText: string;
  panelBgStrong: string;
  inputBg: string;
  registerName: string;
  setRegisterName: (value: string) => void;
  registerEmail: string;
  setRegisterEmail: (value: string) => void;
  registerPassword: string;
  setRegisterPassword: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  oauthProviders: OAuthProvider[];
  onRegister: () => Promise<void>;
  onLogin: () => Promise<void>;
  onLoginWithProvider: (provider: OAuthProvider) => Promise<void>;
}) {
  const toast = useToast();
  const template = relationshipTemplateFromProposal(invite.proposedRelationship);

  return (
    <Grid templateColumns={{ base: '1fr', xl: '1.05fr 0.95fr' }} gap={6}>
      <GridItem>
        <Box bgGradient={heroGradient} borderRadius="3xl" p={{ base: 6, md: 8 }} border="1px solid" borderColor={panelBorder} boxShadow={statGlow}>
          <Stack spacing={5}>
            <Badge alignSelf="start" colorScheme="orange" borderRadius="full" px={3} py={1}>
              Invitation
            </Badge>
            <Box>
              <Heading size="xl">{invite.inviter.name} invited you into Leaf</Heading>
              <Text mt={3} color={mutedText}>
                Review the relationship before you accept. This invite is for {invite.inviteeEmail} and expires on{' '}
                {new Date(invite.expiresAt).toLocaleDateString()}.
              </Text>
            </Box>
            <Box borderRadius="2xl" bg="whiteAlpha.500" _dark={{ bg: 'whiteAlpha.100' }} p={4}>
              <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.12em" color={subtleText}>
                Proposed role
              </Text>
              <Heading size="md" mt={2}>{template.label}</Heading>
              <Text mt={2} color={mutedText}>
                {invite.member
                  ? `${invite.inviter.name} is asking you to guide ${invite.member.name}.`
                  : `${invite.inviter.name} is asking you to join their accountability workspace.`}
              </Text>
            </Box>
            <Stack spacing={3} fontSize="sm">
              <Text>
                <strong>What you can do:</strong> {template.guideCanDo}
              </Text>
              <Text>
                <strong>What you receive:</strong> {template.guideReceives}
              </Text>
              <Text>
                <strong>History by default:</strong> {invite.proposedRelationship.historyWindow}
              </Text>
              <Text>
                <strong>Privacy boundary:</strong> {template.privacy}
              </Text>
            </Stack>
          </Stack>
        </Box>
      </GridItem>
      <GridItem>
        <Stack spacing={5}>
          <Box
            as="form"
            bg={panelBgStrong}
            borderRadius="3xl"
            p={{ base: 5, md: 6 }}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
            onSubmit={(event: FormEvent<HTMLDivElement>) => {
              event.preventDefault();
              onRegister().catch((error) => toast({ status: 'error', title: String(error) }));
            }}
          >
            <Stack spacing={4}>
              <Heading size="md">Create your account and accept</Heading>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input bg={inputBg} value={registerName} onChange={(event) => setRegisterName(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input bg={inputBg} value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} />
                <FormHelperText color={mutedText}>Use the invited email so the relationship can be activated.</FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input bg={inputBg} type="password" value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} />
              </FormControl>
              <Button colorScheme="leaf" type="submit">
                Create Account and Accept Invite
              </Button>
            </Stack>
          </Box>
          <Box
            as="form"
            bg={panelBgStrong}
            borderRadius="3xl"
            p={{ base: 5, md: 6 }}
            border="1px solid"
            borderColor={panelBorder}
            boxShadow={statGlow}
            onSubmit={(event: FormEvent<HTMLDivElement>) => {
              event.preventDefault();
              onLogin().catch((error) => toast({ status: 'error', title: String(error) }));
            }}
          >
            <Stack spacing={4}>
              <Heading size="md">Already have an account?</Heading>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input bg={inputBg} value={email} onChange={(event) => setEmail(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input bg={inputBg} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </FormControl>
              <Button colorScheme="leaf" type="submit">
                Sign In and Accept Invite
              </Button>
              {oauthProviders.length > 0 && (
                <>
                  <Divider />
                  <Text color={mutedText}>Or use another sign-in method that matches the invited email.</Text>
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
        </Stack>
      </GridItem>
    </Grid>
  );
}
