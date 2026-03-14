import type { ProposedRelationship, RelationshipTemplateId } from '@leaf/shared';

export type AuthenticatedUser = {
  id: string;
  email: string;
  roles: string[];
};

export function authUser(request: { user: unknown }): AuthenticatedUser {
  return request.user as AuthenticatedUser;
}

export function hasRole(roles: string[], target: string): boolean {
  return roles.includes(target);
}

export function scheduleKindForStorage(schedule: {
  kind: string;
  schedules?: Array<{ kind: string }>;
}): string {
  if (schedule.kind === 'MULTI') {
    return schedule.schedules?.[0]?.kind ?? 'CUSTOM_DATES';
  }
  return schedule.kind;
}

export function relationshipDefaults() {
  return {
    mode: 'passive' as const,
    canActOnItems: false,
    canManageRoutines: false,
    canManageFollowThrough: false,
    historyWindow: 'Future only',
    hiddenItemCount: 0,
  };
}

export function relationshipTemplate(templateId: RelationshipTemplateId): ProposedRelationship {
  switch (templateId) {
    case 'active-guide':
      return {
        templateId,
        mode: 'active',
        canActOnItems: true,
        canManageRoutines: true,
        canManageFollowThrough: true,
        historyWindow: 'Last 30 days + next due',
      };
    case 'parent':
      return {
        templateId,
        mode: 'active',
        canActOnItems: true,
        canManageRoutines: true,
        canManageFollowThrough: true,
        historyWindow: 'Last 90 days + upcoming items',
      };
    case 'accountability-partner':
      return {
        templateId,
        mode: 'active',
        canActOnItems: true,
        canManageRoutines: false,
        canManageFollowThrough: true,
        historyWindow: 'Future only',
      };
    case 'passive-guide':
    default:
      return {
        templateId: 'passive-guide',
        mode: 'passive',
        canActOnItems: false,
        canManageRoutines: false,
        canManageFollowThrough: false,
        historyWindow: 'Future only',
      };
  }
}

type RelationshipLike = {
  mode?: string | null;
  canActOnItems?: boolean | null;
  canManageRoutines?: boolean | null;
  canManageAccountability?: boolean | null;
  historyWindow?: string | null;
  hiddenItemCount?: number | null;
};

export function normalizeRelationship(relation: RelationshipLike) {
  return {
    mode: relation.mode === 'active' ? 'active' : 'passive',
    canActOnItems: relation.canActOnItems ?? false,
    canManageRoutines: relation.canManageRoutines ?? false,
    canManageFollowThrough: relation.canManageAccountability ?? false,
    historyWindow: relation.historyWindow ?? 'Future only',
    hiddenItemCount: relation.hiddenItemCount ?? 0,
  };
}
