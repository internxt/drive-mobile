import { logger } from '@internxt-mobile/services/common';

type BatchJob = () => Promise<void>;

interface QueueEntry {
  job: BatchJob;
  resolve: () => void;
  reject: (error: unknown) => void;
  batchId: string;
}

export class UploadQueueService {
  private queue: QueueEntry[] = [];
  private isProcessing = false;

  /**
   * Enqueue a batch upload job. Jobs execute serially — each batch
   * waits for the previous one to fully complete before starting.
   * This ensures duplicate checks see all previously uploaded files.
   */
  enqueue(batchId: string, job: BatchJob): Promise<void> {
    logger.info(
      `[UploadQueue] enqueue called - batchId: ${batchId}, isProcessing: ${this.isProcessing}, pendingCount: ${this.queue.length}`,
    );
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ job, resolve, reject, batchId });
      logger.info(`[UploadQueue] Entry added to queue, new queue length: ${this.queue.length}`);
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    logger.info(
      `[UploadQueue] processNext called - isProcessing: ${this.isProcessing}, queueLength: ${this.queue.length}`,
    );

    if (this.isProcessing) {
      logger.info('[UploadQueue] Already processing, skipping');
      return;
    }

    const entry = this.queue.shift();
    if (!entry) {
      logger.info('[UploadQueue] Queue empty, nothing to process');
      return;
    }

    this.isProcessing = true;
    logger.info(
      `[UploadQueue] Starting batch: ${entry.batchId}, remaining in queue: ${this.queue.length}`,
    );

    try {
      await entry.job();
      logger.info(`[UploadQueue] Batch ${entry.batchId} job completed successfully, calling resolve`);
      entry.resolve();
    } catch (error) {
      logger.error(
        `[UploadQueue] Batch ${entry.batchId} job threw error:`,
        JSON.stringify(error),
        (error as Error)?.message,
        (error as Error)?.stack,
      );
      entry.reject(error);
    } finally {
      logger.info(
        `[UploadQueue] Finally block for batch: ${entry.batchId}, setting isProcessing=false, queueLength: ${this.queue.length}`,
      );
      this.isProcessing = false;
      this.processNext();
    }
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  isBusy(): boolean {
    return this.isProcessing;
  }

  /**
   * Clear the pending queue (does NOT abort the active batch).
   * Used on logout or critical error recovery.
   */
  clearPending(): void {
    this.queue = [];
    logger.info('[UploadQueue] Pending queue cleared');
  }
}

export const uploadQueueService = new UploadQueueService();
