# ADR-001: Authentication and Session Model

- Status: Accepted
- Date: 2026-03-07

## Context

leaf needs multi-client authentication (web, CLI, notifier), role-based access control, and a practical user experience for long-lived sessions without repeatedly entering passwords.

## Decision

1. Use local email/password as the default auth mechanism.
2. Keep OAuth/OIDC (Google/Apple) optional and provider-configured.
3. Use short-lived JWT access tokens for API auth.
4. Use database-backed refresh tokens with rotation.
5. Revoke refresh token on logout.
6. Enforce role checks in API for admin operations.

## Rationale

- Works well across web and CLI.
- Keeps base setup simple while allowing optional SSO.
- Rotation + revocation reduces risk vs long-lived static tokens.
- Database-backed refresh state enables explicit invalidation.

## Consequences

Positive:

- Better session UX with stronger control than access-token-only auth.
- Clear extension path for enterprise identity providers.

Tradeoffs:

- Slightly more auth complexity than pure JWT-only.
- Requires refresh-token storage and cleanup policy over time.

## Alternatives considered

1. Access-token-only model: rejected due to poor revocation/session UX.
2. OAuth-only model: rejected to avoid setup friction for self-hosters.
3. Third-party auth service dependency by default: rejected for open-source portability.
