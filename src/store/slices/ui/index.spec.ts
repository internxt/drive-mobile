import uiReducer, { uiActions } from './index';

const initialState = uiReducer(undefined, { type: 'init' });

describe('Notice of a sent message', () => {
  test('when a message is sent, then the notice shows who it went to', () => {
    const state = uiReducer(initialState, uiActions.showSentMessageNotice('someone@example.com'));

    expect(state.sentMessageNotice?.recipientsLabel).toBe('someone@example.com');
  });

  test('when another message is sent while the notice is still shown, then the notice starts over for the new one', () => {
    const firstState = uiReducer(initialState, uiActions.showSentMessageNotice('someone@example.com'));
    const secondState = uiReducer(firstState, uiActions.showSentMessageNotice('someone.else@example.com'));

    expect(secondState.sentMessageNotice?.recipientsLabel).toBe('someone.else@example.com');
    expect(secondState.sentMessageNotice?.revision).not.toBe(firstState.sentMessageNotice?.revision);
  });

  test('when the notice is hidden, then nothing is shown', () => {
    const shownState = uiReducer(initialState, uiActions.showSentMessageNotice('someone@example.com'));

    expect(uiReducer(shownState, uiActions.hideSentMessageNotice()).sentMessageNotice).toBeNull();
  });
});
