import { randomBytes } from 'node:crypto';
import { Issuer, generators } from 'openid-client';
import { env } from './env.js';

export type OAuthProvider = 'google' | 'apple';

type PendingFlow = {
  provider: OAuthProvider;
  codeVerifier: string;
  returnTo: string;
  createdAt: number;
};

const flowStore = new Map<string, PendingFlow>();
const FLOW_TTL_MS = 10 * 60 * 1000;

function pruneFlows(): void {
  const now = Date.now();
  for (const [state, flow] of flowStore.entries()) {
    if (now - flow.createdAt > FLOW_TTL_MS) {
      flowStore.delete(state);
    }
  }
}

function providerConfig(provider: OAuthProvider): {
  issuer: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope: string;
} {
  if (provider === 'google') {
    return {
      issuer: 'https://accounts.google.com',
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
      scope: 'openid email profile',
    };
  }

  return {
    issuer: 'https://appleid.apple.com',
    clientId: env.APPLE_CLIENT_ID,
    clientSecret: env.APPLE_CLIENT_SECRET,
    redirectUri: env.APPLE_REDIRECT_URI,
    scope: 'name email',
  };
}

export function enabledProviders(): OAuthProvider[] {
  const providers: OAuthProvider[] = [];
  const google = providerConfig('google');
  if (google.clientId && google.clientSecret && google.redirectUri) providers.push('google');

  const apple = providerConfig('apple');
  if (apple.clientId && apple.clientSecret && apple.redirectUri) providers.push('apple');

  return providers;
}

async function oauthClient(provider: OAuthProvider) {
  const cfg = providerConfig(provider);
  if (!cfg.clientId || !cfg.clientSecret || !cfg.redirectUri) {
    throw new Error(`OAuth provider '${provider}' is not configured`);
  }

  const issuer = await Issuer.discover(cfg.issuer);
  const client = new issuer.Client({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uris: [cfg.redirectUri],
    response_types: ['code'],
  });

  return { client, cfg };
}

export async function buildAuthorizationUrl(provider: OAuthProvider, returnTo: string): Promise<string> {
  pruneFlows();
  const { client, cfg } = await oauthClient(provider);

  const state = randomBytes(16).toString('hex');
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);

  flowStore.set(state, {
    provider,
    codeVerifier,
    returnTo,
    createdAt: Date.now(),
  });

  return client.authorizationUrl({
    scope: cfg.scope,
    response_type: 'code',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
}

export async function completeOAuth(params: {
  provider: OAuthProvider;
  state: string;
  code: string;
}): Promise<{ email: string; name: string; returnTo: string }> {
  pruneFlows();
  const flow = flowStore.get(params.state);
  if (!flow || flow.provider !== params.provider) {
    throw new Error('Invalid OAuth state');
  }

  flowStore.delete(params.state);
  const { client, cfg } = await oauthClient(params.provider);

  const tokenSet = await client.callback(
    cfg.redirectUri!,
    { code: params.code, state: params.state },
    { code_verifier: flow.codeVerifier, state: params.state },
  );

  const claims = tokenSet.claims();
  const email = typeof claims.email === 'string' ? claims.email : '';
  const name =
    typeof claims.name === 'string' && claims.name.length > 0
      ? claims.name
      : email.split('@')[0] || 'User';

  if (!email) {
    throw new Error('OAuth provider did not return an email address');
  }

  return { email, name, returnTo: flow.returnTo };
}
