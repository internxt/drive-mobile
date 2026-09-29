import { EmailResponse } from '@internxt/sdk/dist/mail/types';

import { MailboxId } from '../../types/mail';
import { filterMessagesInMailbox, getRestoreMailbox, resolveResultMailbox } from './threadMailboxes';

const USER_ADDRESS = 'user@inxt.me';

const MAILBOX_TYPE_BY_ID = { 'id-of-inbox': MailboxId.Inbox, 'id-of-sent': MailboxId.Sent };

const aMessage = ({
  id = 'message',
  mailboxIds = ['id-of-inbox'],
  isDraft = false,
  sender = 'someone@example.com',
}: { id?: string; mailboxIds?: string[]; isDraft?: boolean; sender?: string } = {}) =>
  ({ id, mailboxIds, isDraft, from: [{ email: sender }] }) as EmailResponse;

describe('Picking the messages of a conversation that are in a mailbox', () => {
  test('when a conversation has messages in several mailboxes, then only the ones in the mailbox asked for are kept', () => {
    const received = aMessage({ id: 'received' });
    const reply = aMessage({ id: 'reply', mailboxIds: ['id-of-sent'] });

    expect(filterMessagesInMailbox([received, reply], MailboxId.Inbox, MAILBOX_TYPE_BY_ID)).toEqual([received]);
  });

  test('when it is not yet known which mailbox is which, then no message is kept', () => {
    expect(filterMessagesInMailbox([aMessage()], MailboxId.Inbox, {})).toEqual([]);
  });
});

describe('Choosing where a message in the trash goes back to', () => {
  test('when the message is a draft, then it goes back to the drafts', () => {
    expect(getRestoreMailbox(aMessage({ isDraft: true, sender: USER_ADDRESS }), USER_ADDRESS)).toBe(MailboxId.Drafts);
  });

  test('when the user sent the message, then it goes back to the sent messages', () => {
    expect(getRestoreMailbox(aMessage({ sender: 'User@Inxt.me' }), USER_ADDRESS)).toBe(MailboxId.Sent);
  });

  test('when someone else sent the message, then it goes back to the inbox', () => {
    expect(getRestoreMailbox(aMessage(), USER_ADDRESS)).toBe(MailboxId.Inbox);
  });

  test('when the address of the user is not known, then the message goes back to the inbox', () => {
    expect(getRestoreMailbox(aMessage({ sender: USER_ADDRESS }), '')).toBe(MailboxId.Inbox);
  });
});

describe('Choosing the mailbox a search result opens in', () => {
  test('when the result is a draft, then it opens in the drafts', () => {
    expect(resolveResultMailbox(aMessage({ isDraft: true }), MAILBOX_TYPE_BY_ID)).toBe(MailboxId.Drafts);
  });

  test('when the result is in several mailboxes, then it opens in the one listed first in the menu', () => {
    const sentToOneself = aMessage({ mailboxIds: ['id-of-sent', 'id-of-inbox'] });

    expect(resolveResultMailbox(sentToOneself, MAILBOX_TYPE_BY_ID)).toBe(MailboxId.Inbox);
  });

  test('when the result is only in the sent messages, then it opens there', () => {
    expect(resolveResultMailbox(aMessage({ mailboxIds: ['id-of-sent'] }), MAILBOX_TYPE_BY_ID)).toBe(MailboxId.Sent);
  });

  test('when none of the mailboxes of the result is known, then it opens in the inbox', () => {
    expect(resolveResultMailbox(aMessage({ mailboxIds: ['id-of-a-folder'] }), MAILBOX_TYPE_BY_ID)).toBe(
      MailboxId.Inbox,
    );
  });
});
