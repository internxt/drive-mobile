import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';

/**
 * Collapses a list of emails into one entry per thread.
 * Each entry is the most recent email of its thread, marked as unread when any email in the
 * thread is unread. Entries come back from most to least recently received.
 */
export const groupEmailsByThread = (list: EmailSummaryResponse[]): EmailSummaryResponse[] => {
  const byThread = new Map<string, EmailSummaryResponse[]>();

  for (const email of list) {
    const key = email.threadId || email.id;
    const group = byThread.get(key);
    if (group) {
      group.push(email);
    } else {
      byThread.set(key, [email]);
    }
  }

  return Array.from(byThread.values())
    .map((group) => {
      const latest = group.reduce((a, b) => (new Date(a.receivedAt) > new Date(b.receivedAt) ? a : b), group[0]);
      const hasUnread = group.some((email) => !email.isRead);
      return { ...latest, isRead: !hasUnread };
    })
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
};
