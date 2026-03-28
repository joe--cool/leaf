import {
  hiddenItemVisibilityDescription,
  hiddenItemVisibilityLabel,
  relationshipHistoryWindowDescription,
  relationshipHistoryWindowLabel,
  type HiddenItemVisibility,
  type RelationshipHistoryWindow,
} from '@leaf/shared';

export {
  hiddenItemVisibilityDescription,
  hiddenItemVisibilityLabel,
  relationshipHistoryWindowDescription,
  relationshipHistoryWindowLabel,
};

export function hiddenItemsBoundaryText(
  hiddenItemCount: number,
  hiddenItemVisibility: HiddenItemVisibility,
  emptyText = 'No hidden-item limit is currently recorded for this relationship.',
) {
  if (hiddenItemCount <= 0) return emptyText;
  if (hiddenItemVisibility === 'show-count') {
    return `${hiddenItemCount} hidden item${hiddenItemCount === 1 ? ' stays' : 's stay'} outside this guide's view.`;
  }
  return 'Some items stay outside this guide view, but the count stays private.';
}

export function relationshipHistorySummary(historyWindow: RelationshipHistoryWindow) {
  return `${relationshipHistoryWindowLabel(historyWindow)}. ${relationshipHistoryWindowDescription(historyWindow)}`;
}
