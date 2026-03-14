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
    canManageAccountability: false,
    historyWindow: 'Future only',
    hiddenItemCount: 0,
  };
}
