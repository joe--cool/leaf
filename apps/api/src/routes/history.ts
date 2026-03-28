import type { FastifyInstance } from 'fastify';
import { relationshipHistoryWindowLabel, type RelationshipHistoryWindow } from '@leaf/shared';
import { prisma } from '../prisma.js';
import { authUser } from './shared.js';

type AuditEntry = {
  id: string;
  occurredAt: string;
  category: 'account' | 'relationship' | 'routine' | 'activity' | 'invite';
  scope: 'self' | 'member' | 'guide';
  subjectName: string;
  title: string;
  detail: string;
  actorName: string;
  visibility: string;
};

export async function registerHistoryRoutes(app: FastifyInstance): Promise<void> {
  app.get('/history/audit', { preHandler: [app.authenticate] }, async (request) => {
    const actor = authUser(request);
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      include: {
        reviewTargets: {
          include: {
            reviewee: {
              include: {
                retrospectivesOwned: {
                  include: {
                    createdBy: true,
                    contributions: {
                      include: {
                        author: true,
                      },
                      orderBy: { createdAt: 'desc' },
                      take: 5,
                    },
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                },
                items: {
                  include: {
                    completions: {
                      include: {
                        user: true,
                      },
                      orderBy: { occurredAt: 'desc' },
                      take: 10,
                    },
                    actions: {
                      include: {
                        user: true,
                      },
                      orderBy: { occurredAt: 'desc' },
                      take: 10,
                    },
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                },
              },
            },
          },
        },
        reviewers: {
          include: {
            reviewer: true,
          },
        },
        items: {
          include: {
            completions: {
              include: {
                user: true,
              },
              orderBy: { occurredAt: 'desc' },
              take: 20,
            },
            actions: {
              include: {
                user: true,
              },
              orderBy: { occurredAt: 'desc' },
              take: 20,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        retrospectivesOwned: {
          include: {
            createdBy: true,
            contributions: {
              include: {
                author: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        sentInvites: {
          include: {
            invitee: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) return [];

    const entries: AuditEntry[] = [
      {
        id: `account-${user.id}`,
        occurredAt: user.createdAt.toISOString(),
        category: 'account',
        scope: 'self',
        subjectName: user.name,
        title: 'Account created',
        detail: `${user.name} joined the workspace and started an accountability history.`,
        actorName: user.name,
        visibility: 'Visible in your own account history.',
      },
      ...user.reviewers.map((relation) => ({
        id: `guide-${relation.reviewerId}-${relation.revieweeId}`,
        occurredAt: relation.createdAt.toISOString(),
        category: 'relationship' as const,
        scope: 'guide' as const,
        subjectName: relation.reviewer.name,
        title: `${relation.reviewer.name} became your guide`,
        detail: `Relationship opened with ${relationshipHistoryWindowLabel((relation.historyWindow as RelationshipHistoryWindow) ?? 'future-only')} visibility and ${relation.mode === 'active' ? 'active' : 'passive'} guide permissions.`,
        actorName: relation.reviewer.name,
        visibility: 'Visible because this relationship affects your accountability history.',
      })),
      ...user.reviewTargets.flatMap((relation) => {
        const baseVisibility = `Visible because ${relation.reviewee.name} is in your guide workspace (${relationshipHistoryWindowLabel((relation.historyWindow as RelationshipHistoryWindow) ?? 'future-only')}).`;

        return [
          {
            id: `member-${relation.reviewerId}-${relation.revieweeId}`,
            occurredAt: relation.createdAt.toISOString(),
            category: 'relationship' as const,
            scope: 'member' as const,
            subjectName: relation.reviewee.name,
            title: `Guide relationship started with ${relation.reviewee.name}`,
            detail: `${relation.reviewee.name} is connected as an ${relation.mode === 'active' ? 'active' : 'passive'} relationship with explicit history boundaries.`,
            actorName: user.name,
            visibility: baseVisibility,
          },
          ...relation.reviewee.items.map((item) => ({
            id: `member-item-${item.id}`,
            occurredAt: item.createdAt.toISOString(),
            category: 'routine' as const,
            scope: 'member' as const,
            subjectName: relation.reviewee.name,
            title: `${relation.reviewee.name} added ${item.title}`,
            detail: 'A visible routine entered this relationship workspace.',
            actorName: relation.reviewee.name,
            visibility: baseVisibility,
          })),
          ...relation.reviewee.items.flatMap((item) =>
            item.completions.map((completion) => ({
              id: `member-completion-${completion.id}`,
              occurredAt: completion.occurredAt.toISOString(),
              category: 'activity' as const,
              scope: 'member' as const,
              subjectName: relation.reviewee.name,
              title: `${relation.reviewee.name} recorded activity on ${item.title}`,
              detail: completion.note?.trim() ? completion.note.trim() : 'Completion recorded without a note.',
              actorName: completion.user.name,
              visibility: baseVisibility,
            })),
          ),
          ...relation.reviewee.items.flatMap((item) =>
            item.actions.map((action) => ({
              id: `member-action-${action.id}`,
              occurredAt: action.occurredAt.toISOString(),
              category: 'activity' as const,
              scope: 'member' as const,
              subjectName: relation.reviewee.name,
              title:
                action.kind === 'SKIP'
                  ? `${relation.reviewee.name} skipped ${item.title}`
                  : `${relation.reviewee.name} added a note on ${item.title}`,
              detail:
                action.kind === 'SKIP'
                  ? action.note?.trim() || 'Occurrence skipped without an added note.'
                  : action.note?.trim() || 'Occurrence note added without extra detail.',
              actorName: action.user.name,
              visibility: baseVisibility,
            })),
          ),
          ...(relation.reviewee.retrospectivesOwned ?? []).flatMap((retrospective) => [
            {
              id: `member-retrospective-${retrospective.id}`,
              occurredAt: retrospective.createdAt.toISOString(),
              category: 'activity' as const,
              scope: 'member' as const,
              subjectName: relation.reviewee.name,
              title: `${relation.reviewee.name} looking-back entry created`,
              detail: `${retrospective.title} opened a shared reflection artifact.`,
              actorName: retrospective.createdBy.name,
              visibility: baseVisibility,
            },
            ...retrospective.contributions.map((contribution) => ({
              id: `member-retrospective-note-${contribution.id}`,
              occurredAt: contribution.createdAt.toISOString(),
              category: 'activity' as const,
              scope: 'member' as const,
              subjectName: relation.reviewee.name,
              title: `${contribution.author.name} added a reflective note`,
              detail: contribution.body,
              actorName: contribution.author.name,
              visibility: baseVisibility,
            })),
          ]),
        ];
      }),
      ...user.items.map((item) => ({
        id: `item-${item.id}`,
        occurredAt: item.createdAt.toISOString(),
        category: 'routine' as const,
        scope: 'self' as const,
        subjectName: user.name,
        title: `Created ${item.title}`,
        detail: 'A routine was added to your own workspace.',
        actorName: user.name,
        visibility: 'Visible in your own account history and to permitted guides.',
      })),
      ...user.items.flatMap((item) =>
        item.completions.map((completion) => ({
          id: `completion-${completion.id}`,
          occurredAt: completion.occurredAt.toISOString(),
          category: 'activity' as const,
          scope: 'self' as const,
          subjectName: user.name,
          title: `Recorded activity on ${item.title}`,
          detail: completion.note?.trim() ? completion.note.trim() : 'Completion recorded without a note.',
          actorName: completion.user.name,
          visibility: 'Visible in your own account history and to permitted guides.',
        })),
      ),
      ...user.items.flatMap((item) =>
        item.actions.map((action) => ({
          id: `action-${action.id}`,
          occurredAt: action.occurredAt.toISOString(),
          category: 'activity' as const,
          scope: 'self' as const,
          subjectName: user.name,
          title: action.kind === 'SKIP' ? `Skipped ${item.title}` : `Added a note on ${item.title}`,
          detail:
            action.kind === 'SKIP'
              ? action.note?.trim() || 'Occurrence skipped without an added note.'
              : action.note?.trim() || 'Occurrence note added without extra detail.',
          actorName: action.user.name,
          visibility: 'Visible in your own account history and to permitted guides.',
        })),
      ),
      ...(user.retrospectivesOwned ?? []).flatMap((retrospective) => [
        {
          id: `retrospective-${retrospective.id}`,
          occurredAt: retrospective.createdAt.toISOString(),
          category: 'activity' as const,
          scope: 'self' as const,
          subjectName: user.name,
          title: `Created looking-back entry ${retrospective.title}`,
          detail: 'A shared reflection artifact was created.',
          actorName: retrospective.createdBy.name,
          visibility: 'Visible in your own account history and to permitted guides.',
        },
        ...retrospective.contributions.map((contribution) => ({
          id: `retrospective-note-${contribution.id}`,
          occurredAt: contribution.createdAt.toISOString(),
          category: 'activity' as const,
          scope: 'self' as const,
          subjectName: user.name,
          title: `${contribution.author.name} added a reflective note`,
          detail: contribution.body,
          actorName: contribution.author.name,
          visibility: 'Visible in your own account history and to permitted guides.',
        })),
      ]),
      ...user.sentInvites.map((invite) => ({
        id: `invite-${invite.id}`,
        occurredAt: invite.createdAt.toISOString(),
        category: 'invite' as const,
        scope: 'self' as const,
        subjectName: invite.invitee?.name ?? invite.inviteeMail,
        title: `Sent guide invite to ${invite.invitee?.name ?? invite.inviteeMail}`,
        detail: invite.acceptedAt
          ? 'The invite was accepted and turned into a relationship.'
          : 'Waiting for the invited person to accept.',
        actorName: user.name,
        visibility: 'Visible because invitations change relationship transparency.',
      })),
    ];

    return entries.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  });
}
