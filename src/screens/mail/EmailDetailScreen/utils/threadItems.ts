const MIN_MESSAGES_TO_GROUP = 5;
const TRAILING_MESSAGES_KEPT_VISIBLE = 2;

export type ThreadItem = { type: 'message'; messageId: string } | { type: 'gap'; hiddenMessageIds: string[] };

/**
 * Lists what a conversation shows, in order: its messages, with the collapsed ones in the middle replaced by
 * a single gap while the gap is closed and the conversation is long enough to group.
 */
export const groupThreadItems = (
  messageIds: string[],
  expandedMessageIds: string[],
  isGapOpen: boolean,
): ThreadItem[] => {
  const canGroup = !isGapOpen && messageIds.length >= MIN_MESSAGES_TO_GROUP;
  const lastGroupableIndex = messageIds.length - TRAILING_MESSAGES_KEPT_VISIBLE - 1;
  const isHiddenInGap = (messageId: string, index: number) =>
    canGroup && index > 0 && index <= lastGroupableIndex && !expandedMessageIds.includes(messageId);

  const hiddenMessageIds = messageIds.filter(isHiddenInGap);
  const items: ThreadItem[] = [];

  messageIds.forEach((messageId, index) => {
    if (!isHiddenInGap(messageId, index)) {
      items.push({ type: 'message', messageId });
      return;
    }
    if (messageId === hiddenMessageIds[0]) {
      items.push({ type: 'gap', hiddenMessageIds });
    }
  });

  return items;
};
