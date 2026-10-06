import { act, renderHook } from '@testing-library/react-native';

import { RecipientsByField } from '../utils/composeRecipients';
import { useComposeRecipients } from './useComposeRecipients';

describe('Holding the recipients of a message being written', () => {
  test('when a message is sent with an address still being typed, then the address is part of the recipients it is sent with', () => {
    const { result } = renderHook(() => useComposeRecipients({}));

    act(() => result.current.changePendingText('to', 'ada@inxt.me'));
    let sentRecipients: RecipientsByField | undefined;
    act(() => {
      sentRecipients = result.current.resolveRecipientsForSending().recipients;
    });

    expect(sentRecipients?.to).toEqual(['ada@inxt.me']);
    expect(result.current.recipients.to).toEqual(['ada@inxt.me']);
    expect(result.current.pendingText.to).toBe('');
  });

  test('when an address is typed and sent in the same moment, then the recipients it is sent with already include it', () => {
    const { result } = renderHook(() => useComposeRecipients({}));

    let sentRecipients: RecipientsByField | undefined;
    act(() => {
      result.current.changePendingText('bcc', 'grace@inxt.me');
      sentRecipients = result.current.resolveRecipientsForSending().recipients;
    });

    expect(sentRecipients?.bcc).toEqual(['grace@inxt.me']);
  });

  test('when something typed in blind copy cannot be read as an address, then it is reported and kept typed instead of being dropped', () => {
    const { result } = renderHook(() => useComposeRecipients({ to: ['ada@inxt.me'] }));

    act(() => result.current.changePendingText('bcc', 'grace@inxt, alan@inxt.me'));
    let unreadableRecipientText: string[] = [];
    act(() => {
      unreadableRecipientText = result.current.resolveRecipientsForSending().unreadableRecipientText;
    });

    expect(unreadableRecipientText).toEqual(['grace@inxt']);
    expect(result.current.recipients.bcc).toEqual(['alan@inxt.me']);
    expect(result.current.pendingText.bcc).toBe('grace@inxt');
  });

  test('when a field finishes its entry again right after sending, then no recipient appears twice and the leftover text is kept', () => {
    const { result } = renderHook(() => useComposeRecipients({}));

    act(() => result.current.changePendingText('cc', 'grace@inxt.me, not an address'));
    act(() => {
      result.current.resolveRecipientsForSending();
    });
    act(() => result.current.addTypedRecipients('cc', 'grace@inxt.me, not an address'));

    expect(result.current.recipients.cc).toEqual(['grace@inxt.me']);
    expect(result.current.pendingText.cc).toBe('not an address');
  });

  test('when an address that is in copy is typed as a main recipient, then it moves out of copy', () => {
    const { result } = renderHook(() => useComposeRecipients({ cc: ['grace@inxt.me'] }));

    act(() => result.current.addTypedRecipients('to', 'grace@inxt.me'));

    expect(result.current.recipients).toEqual({ to: ['grace@inxt.me'], cc: [], bcc: [] });
  });

  test('when a draft is loaded with the same address in two fields, then it is kept only in the most visible one and nothing is left typed', () => {
    const { result } = renderHook(() => useComposeRecipients({}));

    act(() => result.current.changePendingText('cc', 'half typed'));
    act(() =>
      result.current.replaceRecipients({ to: ['first@inxt.me'], cc: ['second@inxt.me'], bcc: ['FIRST@inxt.me'] }),
    );

    expect(result.current.recipients).toEqual({ to: ['first@inxt.me'], cc: ['second@inxt.me'], bcc: [] });
    expect(result.current.pendingText).toEqual({ to: '', cc: '', bcc: '' });
  });

  test('when a message starts as a reply, then its recipients are the ones it was opened with', () => {
    const { result } = renderHook(() => useComposeRecipients({ to: ['ada@inxt.me'], cc: ['grace@inxt.me'] }));

    expect(result.current.recipients).toEqual({ to: ['ada@inxt.me'], cc: ['grace@inxt.me'], bcc: [] });
  });

  test('when a recipient is removed, then it leaves only the field it was taken out of', () => {
    const { result } = renderHook(() => useComposeRecipients({ to: ['ada@inxt.me'], cc: ['grace@inxt.me'] }));

    act(() => result.current.removeRecipient('cc', 'grace@inxt.me'));

    expect(result.current.recipients).toEqual({ to: ['ada@inxt.me'], cc: [], bcc: [] });
  });
});
