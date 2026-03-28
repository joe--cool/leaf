import { describe, expect, it } from 'vitest';
import { resolveTemplateDraft } from './itemTemplates';

describe('resolveTemplateDraft', () => {
  it('returns the recurring variant for a named template', () => {
    const draft = resolveTemplateDraft('medication', 'recurring');

    expect(draft).toMatchObject({
      category: 'health',
      title: 'Take evening supplement',
      draftSchedules: [{ kind: 'DAILY', dailyTimes: ['20:00'] }],
    });
  });

  it('returns the one-time variant for a named template', () => {
    const draft = resolveTemplateDraft('school', 'one-time');

    expect(draft.category).toBe('homework');
    expect(draft.title).toBe('Turn in assignment');
    expect(draft.draftSchedules[0]).toMatchObject({
      kind: 'ONE_TIME',
    });
    expect(draft.draftSchedules[0]?.oneTimeAt).toMatch(/T16:00$/);
  });

  it('returns sensible scratch defaults for one-time items', () => {
    const draft = resolveTemplateDraft('scratch', 'one-time');

    expect(draft).toMatchObject({
      category: 'other',
      title: 'Handle this once',
      draftSchedules: [{ kind: 'ONE_TIME' }],
    });
  });
});
