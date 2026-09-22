import { act, renderHook } from '@testing-library/react-native';

import { useMailboxSelection } from './useMailboxSelection';

describe('Selecting conversations in a mailbox', () => {
  test('when a conversation is selected, then the list enters selection mode', () => {
    const { result } = renderHook(() => useMailboxSelection(['first', 'second']));

    act(() => result.current.toggleEmailSelection('first'));

    expect(result.current.isSelecting).toBe(true);
    expect(result.current.selectedEmailIds).toEqual(['first']);
  });

  test('when the only selected conversation is unselected, then the list leaves selection mode', () => {
    const { result } = renderHook(() => useMailboxSelection(['first']));

    act(() => result.current.toggleEmailSelection('first'));
    act(() => result.current.toggleEmailSelection('first'));

    expect(result.current.isSelecting).toBe(false);
  });

  test('when a selected conversation leaves the list, then it is no longer selected', () => {
    const { result, rerender } = renderHook(({ listedEmailIds }) => useMailboxSelection(listedEmailIds), {
      initialProps: { listedEmailIds: ['moved', 'stays'] },
    });
    act(() => result.current.toggleEmailSelection('moved'));
    act(() => result.current.toggleEmailSelection('stays'));

    rerender({ listedEmailIds: ['stays'] });

    expect(result.current.selectedEmailIds).toEqual(['stays']);
  });

  test('when a selected conversation leaves the list and comes back after selection mode ended, then it is not selected', () => {
    const { result, rerender } = renderHook(({ listedEmailIds }) => useMailboxSelection(listedEmailIds), {
      initialProps: { listedEmailIds: ['hidden', 'stays'] },
    });
    act(() => result.current.toggleEmailSelection('hidden'));
    act(() => result.current.toggleEmailSelection('stays'));
    rerender({ listedEmailIds: ['stays'] });
    act(() => result.current.toggleEmailSelection('stays'));

    rerender({ listedEmailIds: ['hidden', 'stays'] });

    expect(result.current.isSelecting).toBe(false);
  });

  test('when the selection is cleared, then no conversation stays selected', () => {
    const { result } = renderHook(() => useMailboxSelection(['first', 'second']));
    act(() => result.current.toggleEmailSelection('first'));
    act(() => result.current.toggleEmailSelection('second'));

    act(() => result.current.clearSelection());

    expect(result.current.isSelecting).toBe(false);
  });

  test('when every conversation is selected, then all the listed ones are selected', () => {
    const { result } = renderHook(() => useMailboxSelection(['first', 'second']));

    act(() => result.current.selectAll());

    expect(result.current.selectedEmailIds).toEqual(['first', 'second']);
    expect(result.current.areAllSelected).toBe(true);
  });
});
