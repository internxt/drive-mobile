import { SdkManager } from '@internxt-mobile/services/common';
import {
  EmailSummaryResponse,
  MailboxResponse,
  EmailResponse,
  MailAccountKeysResponse,
  DownloadAttachmentPayload,
  DownloadAttachmentResponse,
  UploadAttachmentResponse,
  SendEmailRequest,
  EmailCreatedResponse,
  LookupRecipientKeysResponse,
  UpdateEmailRequest,
} from '@internxt/sdk/dist/mail/types';

const DEFAULT_LIMIT = 50;

class MailboxService {
  private readonly sdk: SdkManager;
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

  /**
   * Gets the mail account keys for the given address.
   */
  public async getMailAccountKeys(address?: string): Promise<MailAccountKeysResponse> {
    return this.sdk.mail.getMailAccountKeys(address);
  }

  /**
   * Download email attachment
   */
  public async downloadAttachment(
    emailId: string,
    blobId: string,
    query?: DownloadAttachmentPayload,
  ): Promise<DownloadAttachmentResponse> {
    return this.sdk.mail.downloadAttachment(emailId, blobId, query);
  }

  public async uploadAttachment(file: { uri: string; name: string; type: string }): Promise<UploadAttachmentResponse> {
    const { promise } = this.sdk.mail.uploadAttachment(file as unknown as File);
    return promise;
  }

  public async sendEmail(body: SendEmailRequest): Promise<EmailCreatedResponse> {
    return this.sdk.mail.sendEmail(body);
  }

  public async getRecipientsWithPublicKeys(addresses: string[]): Promise<LookupRecipientKeysResponse> {
    return this.sdk.mail.lookupRecipientKeys(addresses);
  }

  public async updateEmail(emailId: string, body: UpdateEmailRequest): Promise<void> {
    return this.sdk.mail.updateEmail(emailId, body);
  }
}

export const mailboxService = new MailboxService(SdkManager.getInstance());
