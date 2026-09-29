import { groupThreadItems } from './threadItems';

const messageIds = (count: number) => Array.from({ length: count }, (_, index) => `message-${index + 1}`);
const shown = (id: string) => ({ type: 'message', messageId: id });

describe('Which messages of a conversation are shown', () => {
  test('when the conversation has four messages or fewer, then every message is shown', () => {
    const ids = messageIds(4);

    expect(groupThreadItems(ids, ['message-4'], false)).toEqual(ids.map(shown));
  });

  test('when the conversation has five messages or more, then the ones between the first and the last two are grouped', () => {
    const items = groupThreadItems(messageIds(6), ['message-6'], false);

    expect(items).toEqual([
      shown('message-1'),
      { type: 'gap', hiddenMessageIds: ['message-2', 'message-3', 'message-4'] },
      shown('message-5'),
      shown('message-6'),
    ]);
  });

  test('when the conversation has exactly five messages, then the second and third are grouped', () => {
    const items = groupThreadItems(messageIds(5), ['message-5'], false);

    expect(items).toEqual([
      shown('message-1'),
      { type: 'gap', hiddenMessageIds: ['message-2', 'message-3'] },
      shown('message-4'),
      shown('message-5'),
    ]);
  });

  test('when the grouped messages have been asked for, then every message is shown', () => {
    const ids = messageIds(6);

    expect(groupThreadItems(ids, ['message-6'], true)).toEqual(ids.map(shown));
  });

  test('when a message in the middle is open, then it stays visible and the rest are still grouped', () => {
    const items = groupThreadItems(messageIds(7), ['message-3', 'message-7'], false);

    expect(items).toEqual([
      shown('message-1'),
      { type: 'gap', hiddenMessageIds: ['message-2', 'message-4', 'message-5'] },
      shown('message-3'),
      shown('message-6'),
      shown('message-7'),
    ]);
  });

  test('when every message in the middle is open, then nothing is grouped', () => {
    const ids = messageIds(5);

    expect(groupThreadItems(ids, ['message-2', 'message-3', 'message-5'], false)).toEqual(ids.map(shown));
  });
});
