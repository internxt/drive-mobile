import { SdkManager } from '@internxt-mobile/services/common';
import {
  DownloadAttachmentPayload,
  DownloadAttachmentResponse,
  DraftEmailRequest,
  EmailCreatedResponse,
  EmailDomainsResponse,
  EmailListResponse,
  EmailResponse,
  LookupRecipientKeysResponse,
  MailAccountKeysResponse,
  MailboxResponse,
  ReplyEmailRequest,
  SearchFiltersQuery,
  SendEmailRequest,
  UpdateEmailRequest,
  UploadAttachmentResponse,
} from '@internxt/sdk/dist/mail/types';
import { MailboxId } from '../../types/mail';
import { AttachmentUploadAbortedError } from './errors';

export const MAILBOX_PAGE_SIZE = 25;
export const SEARCH_PAGE_SIZE = 25;

export type SearchQuery = Omit<SearchFiltersQuery, 'limit' | 'position'>;

export class MailboxService {
  private readonly sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  /**
   * Lists one page of the emails of a mailbox, newest first.
   *
   * @param mailbox - The mailbox to list.
   * @param options - Where the page starts.
   * @param options.anchorId - The anchor the previous page returned; the first page is listed when omitted.
   * @returns The emails of the page, whether the mailbox has more, and the anchor of the next page.
   */
  public async listEmails(mailbox: MailboxId, { anchorId }: { anchorId?: string } = {}): Promise<EmailListResponse> {
    return this.sdk.mail.listEmails({ mailbox, limit: MAILBOX_PAGE_SIZE, anchorId });
  }

  /**
   * Searches the emails of every mailbox, one page at a time.
   *
   * @param page.position - How many results come before this page.
   * @param page.limit - How many results the page holds; `SEARCH_PAGE_SIZE` when omitted.
   */
  public async searchEmails(
    query: SearchQuery,
    { position, limit = SEARCH_PAGE_SIZE }: { position: number; limit?: number },
  ): Promise<EmailListResponse> {
    return this.sdk.mail.search({ ...query, limit, position });
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

  public async deleteEmail(emailId: string): Promise<void> {
    return this.sdk.mail.deleteEmail(emailId);
  }
}

export const mailboxService = new MailboxService(SdkManager.getInstance());
