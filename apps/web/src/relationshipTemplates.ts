import type { ProposedRelationship } from '@leaf/shared';
import type { RelationshipTemplateCard } from './appTypes';

export const relationshipTemplates: RelationshipTemplateCard[] = [
  {
    id: 'active-guide',
    label: 'Active Guide',
    badge: 'Operational support',
    mode: 'active',
    guideCanDo: 'Can help act on items, manage routines, and step into accountability support.',
    guideReceives: 'Gets timely updates, escalations, and recurring digest context.',
    history: 'Usually starts with recent history plus upcoming work.',
    privacy: 'Hidden items stay hidden, but the guide should still know some work is out of view.',
  },
  {
    id: 'passive-guide',
    label: 'Passive Guide',
    badge: 'Observation first',
    mode: 'passive',
    guideCanDo: 'Can review progress and context, but should not get operational controls by default.',
    guideReceives: 'Gets summaries and digest context without intervention-heavy alerts.',
    history: 'Defaults to future-facing visibility unless you later expand it.',
    privacy: 'Hidden items remain private and only appear as a visibility boundary.',
  },
  {
    id: 'parent',
    label: 'Parent',
    badge: 'Higher-trust oversight',
    mode: 'active',
    guideCanDo: 'May need stronger accountability controls, delegated setup, and visibility into major account history.',
    guideReceives: 'Gets summary updates plus major transparency events that affect the child account.',
    history: 'Parents should expect broader retrospective and audit visibility.',
    privacy: 'Every hidden-item rule should be stated explicitly because family oversight is sensitive.',
  },
  {
    id: 'accountability-partner',
    label: 'Accountability Partner',
    badge: 'Reciprocal by direction',
    mode: 'active',
    guideCanDo: 'Can check in, help act on work, and support accountability without acting like an admin.',
    guideReceives: 'Gets practical nudges, digest context, and shared transparency language.',
    history: 'Often starts future-only, then expands if both sides want more context.',
    privacy: 'Use when both sides want clear boundaries instead of implied full visibility.',
  },
];

export function templateCardById(templateId: string): RelationshipTemplateCard {
  return relationshipTemplates.find((entry) => entry.id === templateId) ?? relationshipTemplates[1]!;
}

export function relationshipTemplateFromProposal(proposal: ProposedRelationship): RelationshipTemplateCard {
  return templateCardById(proposal.templateId);
}
