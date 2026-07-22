import { SdkManager } from '@internxt-mobile/services/common';
import { EmailSummaryResponse, MailboxResponse, EmailResponse } from '@internxt/sdk/dist/mail/types';

const DEFAULT_LIMIT = 50;

class MailboxService {
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  /**
   * Lists emails of the user
   */
  public async listEmails(
    mailbox: 'inbox' | 'drafts' | 'sent' | 'trash' | 'spam' | 'archive',
    limit = DEFAULT_LIMIT,
    position = 0,
  ): Promise<EmailSummaryResponse[]> {
    const response = await this.sdk.mail.listEmails({ mailbox, limit, position });
    return response.emails;
  }

  /**
   * Gets the mailboxes of the user
   */
  public async getMailboxes(): Promise<MailboxResponse[]> {
    return this.sdk.mail.getMailboxes();
  }

  /**
   * Gets the email with the corresponding id
   */
  public async getThread(emailId: string): Promise<EmailResponse[]> {
    return this.sdk.mail.getThreads(emailId);
  }
}

export const mailboxService = new MailboxService(SdkManager.getInstance());
