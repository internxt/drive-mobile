import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';

const receivedAtTime = (email: EmailSummaryResponse): number => new Date(email.receivedAt).getTime();

/**
 * Orders emails the way a mailbox shows them.
 *
 * @param emails - The emails to order.
 * @returns A new array with the most recently received email first.
 */
export const sortNewestFirst = (emails: EmailSummaryResponse[]): EmailSummaryResponse[] =>
  [...emails].sort((first, second) => receivedAtTime(second) - receivedAtTime(first));

/**
 * Picks the email the next page of a mailbox continues after: the oldest one loaded that has not already
 * failed as a starting point.
 *
 * @param loadedEmails - The emails loaded in the mailbox.
 * @param failedAnchorIds - Ids of the emails a further page already failed to continue after.
 * @returns The id of that email, or undefined when there is none.
 */
export const findNextPageAnchorId = (
  loadedEmails: EmailSummaryResponse[],
  failedAnchorIds: ReadonlySet<string>,
): string | undefined => {
  let oldestEmail: EmailSummaryResponse | undefined;
  loadedEmails.forEach((email) => {
    if (failedAnchorIds.has(email.id)) {
      return;
    }
    if (!oldestEmail || receivedAtTime(email) < receivedAtTime(oldestEmail)) {
      oldestEmail = email;
    }
  });
  return oldestEmail?.id;
};

/**
 * Puts the newest page of a mailbox over the emails already loaded. Emails that belong to the time the
 * page covers but no longer come in it are dropped, and so is any older row of a conversation the page
 * brings again, except in the drafts mailbox, where every draft is its own row. Everything older than
 * the page stays as it was.
 *
 * @param params - What to merge.
 * @param params.loadedEmails - The emails loaded in the mailbox.
 * @param params.newestEmails - The newest page of the mailbox; it must not be empty.
 * @param params.isDraftsMailbox - Whether the mailbox is the drafts mailbox.
 * @returns The emails of the mailbox after the merge.
 */
export const mergeNewestPage = ({
  loadedEmails,
  newestEmails,
  isDraftsMailbox,
}: {
  loadedEmails: EmailSummaryResponse[];
  newestEmails: EmailSummaryResponse[];
  isDraftsMailbox: boolean;
}): EmailSummaryResponse[] => {
  const newestEmailIds = new Set(newestEmails.map((email) => email.id));
  const newestThreadIds = new Set(newestEmails.map((email) => email.threadId).filter(Boolean));
  const oldestNewestPageTime = Math.min(...newestEmails.map(receivedAtTime));

  const keptEmails = loadedEmails.filter((email) => {
    const isInNewestPageTime = receivedAtTime(email) >= oldestNewestPageTime;
    const isOlderRowOfRefreshedThread = !isDraftsMailbox && newestThreadIds.has(email.threadId);
    return !newestEmailIds.has(email.id) && !isInNewestPageTime && !isOlderRowOfRefreshedThread;
  });

  return [...newestEmails, ...keptEmails];
};
