import type {
  HiddenItemVisibility,
  ProposedRelationship,
  RelationshipHistoryWindow,
  RelationshipTemplateId,
} from '@leaf/shared';
import {
  hiddenItemVisibilitySchema,
  relationshipHistoryWindowLabel,
  relationshipHistoryWindowSchema,
  relationshipTemplateSettings,
  relationshipTemplateIdSchema,
} from '@leaf/shared';

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
    templateId: 'passive-guide' as const,
    mode: 'passive' as const,
    canActOnItems: false,
    canManageRoutines: false,
    canManageFollowThrough: false,
    historyWindow: 'future-only' as const,
    hiddenItemVisibility: 'show-count' as const,
    hiddenItemCount: 0,
  };
}

export function relationshipTemplate(templateId: RelationshipTemplateId): ProposedRelationship {
  return relationshipTemplateSettings(templateId);
}

type RelationshipLike = {
  templateId?: string | null;
  mode?: string | null;
  canActOnItems?: boolean | null;
  canManageRoutines?: boolean | null;
  canManageAccountability?: boolean | null;
  historyWindow?: string | null;
  hiddenItemVisibility?: string | null;
  hiddenItemCount?: number | null;
};

export function normalizeRelationship(relation: RelationshipLike) {
  const historyWindow = relationshipHistoryWindowSchema.safeParse(relation.historyWindow).success
    ? (relation.historyWindow as RelationshipHistoryWindow)
    : relationshipDefaults().historyWindow;
  const hiddenItemVisibility = hiddenItemVisibilitySchema.safeParse(relation.hiddenItemVisibility).success
    ? (relation.hiddenItemVisibility as HiddenItemVisibility)
    : relationshipDefaults().hiddenItemVisibility;
  const templateId = relationshipTemplateIdSchema.safeParse(relation.templateId).success
    ? relation.templateId
    : relationshipDefaults().templateId;

  return {
    templateId,
    mode: relation.mode === 'active' ? 'active' : 'passive',
    canActOnItems: relation.canActOnItems ?? false,
    canManageRoutines: relation.canManageRoutines ?? false,
    canManageFollowThrough: relation.canManageAccountability ?? false,
    historyWindow,
    historyWindowLabel: relationshipHistoryWindowLabel(historyWindow),
    hiddenItemVisibility,
    hiddenItemCount: relation.hiddenItemCount ?? 0,
  };
}
