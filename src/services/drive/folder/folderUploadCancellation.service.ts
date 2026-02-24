/**
 * Tracks {@link AbortController}s for active folder uploads, keyed by `uploadId`.
 * Decouples upload registration (AddModal) from cancellation (drive list items).
 */
class FolderUploadCancellationService {
  private controllers = new Map<string, AbortController>();

  /** Registers `controller` for `uploadId` before starting the upload. */
  public register(uploadId: string, controller: AbortController): void {
    this.controllers.set(uploadId, controller);
  }

  /** Aborts and deregisters the upload. No-op if `uploadId` is unknown. */
  public cancel(uploadId: string): void {
    this.controllers.get(uploadId)?.abort();
    this.controllers.delete(uploadId);
  }

  /** Deregisters `uploadId` without aborting. Call in the upload's `finally` block. */
  public clear(uploadId: string): void {
    this.controllers.delete(uploadId);
  }
}

export const folderUploadCancellationService = new FolderUploadCancellationService();
