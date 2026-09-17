import { SdkManager } from '@internxt-mobile/services/common';
import {
  DownloadAttachmentPayload,
  DownloadAttachmentResponse,
  DraftEmailRequest,
  EmailCreatedResponse,
  EmailDomainsResponse,
  EmailResponse,
  EmailSummaryResponse,
  LookupRecipientKeysResponse,
  MailAccountKeysResponse,
  MailboxResponse,
  ReplyEmailRequest,
  SendEmailRequest,
  UpdateEmailRequest,
  UploadAttachmentResponse,
} from '@internxt/sdk/dist/mail/types';
import { AttachmentUploadAbortedError } from './errors';

const DEFAULT_LIMIT = 50;

export class MailboxService {
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
   * Gets the domains the server treats as internal.
   */
  public async getActiveDomains(): Promise<EmailDomainsResponse> {
    return this.sdk.mail.getActiveDomains();
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

  public uploadAttachment(
    file: { uri: string; name: string; type: string },
    abortSignal?: AbortSignal,
  ): Promise<UploadAttachmentResponse> {
    if (abortSignal?.aborted) {
      return Promise.reject(new AttachmentUploadAbortedError());
    }
    const { promise: pendingUploadResponse, requestCanceler } = this.sdk.mail.uploadAttachment(file as unknown as File);
    if (!abortSignal) {
      return pendingUploadResponse;
    }

    return new Promise((resolve, reject) => {
      const cancelUpload = () => {
        requestCanceler.cancel();
        reject(new AttachmentUploadAbortedError());
      };
      abortSignal.addEventListener('abort', cancelUpload);
      pendingUploadResponse.then(resolve, reject).finally(() => abortSignal.removeEventListener('abort', cancelUpload));
    });
  }

  public async replyEmail(emailId: string, body: ReplyEmailRequest): Promise<EmailCreatedResponse> {
    return this.sdk.mail.replyEmail(emailId, body);
  }

  public async sendEmail(body: SendEmailRequest): Promise<EmailCreatedResponse> {
    return this.sdk.mail.sendEmail(body);
  }

  public async getRecipientsWithPublicKeys(addresses: string[]): Promise<LookupRecipientKeysResponse> {
    return this.sdk.mail.lookupRecipientKeys(addresses);
  }

  public async saveDraft(body: DraftEmailRequest): Promise<EmailResponse> {
    return this.sdk.mail.saveDraft(body);
  }

  public async updateDraft(draftId: string, body: DraftEmailRequest): Promise<EmailResponse> {
    return this.sdk.mail.updateDraft(draftId, body);
  }

  public async getDraft(draftId: string): Promise<EmailResponse> {
    return this.sdk.mail.getDraft(draftId);
  }

  public async discardDraft(draftId: string): Promise<void> {
    return this.sdk.mail.discardDraft(draftId);
  }

  public async updateEmail(emailId: string, body: UpdateEmailRequest): Promise<void> {
    return this.sdk.mail.updateEmail(emailId, body);
  }
}

export const mailboxService = new MailboxService(SdkManager.getInstance());
