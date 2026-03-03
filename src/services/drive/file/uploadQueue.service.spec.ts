import { UploadQueueService } from './uploadQueue.service';

jest.mock('@internxt-mobile/services/common', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

const createDeferred = (): Deferred => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('Upload Queue Service', () => {
  let sut: UploadQueueService;

  beforeEach(() => {
    sut = new UploadQueueService();
  });

  describe('When enqueueing a single job', () => {
    it('when a job is enqueued, then it executes immediately', async () => {
      const jobExecuted = jest.fn();

      await sut.enqueue('batch-1', async () => {
        jobExecuted();
      });

      expect(jobExecuted).toHaveBeenCalledTimes(1);
    });

    it('when a job completes successfully, then the enqueue promise resolves', async () => {
      const result = sut.enqueue('batch-1', async () => {
        // no-op
      });

      await expect(result).resolves.toBeUndefined();
    });

    it('when a job throws an error, then the enqueue promise rejects with that error', async () => {
      const error = new Error('upload failed');

      const result = sut.enqueue('batch-1', async () => {
        throw error;
      });

      await expect(result).rejects.toBe(error);
    });
  });

  describe('When enqueueing multiple jobs', () => {
    it('when multiple jobs are enqueued, then they execute in FIFO order', async () => {
      const executionOrder: string[] = [];

      const promise1 = sut.enqueue('batch-1', async () => {
        executionOrder.push('first');
      });

      const promise2 = sut.enqueue('batch-2', async () => {
        executionOrder.push('second');
      });

      const promise3 = sut.enqueue('batch-3', async () => {
        executionOrder.push('third');
      });

      await Promise.all([promise1, promise2, promise3]);

      expect(executionOrder).toEqual(['first', 'second', 'third']);
    });

    it('when a job is running, then subsequent jobs wait until it completes', async () => {
      const deferred = createDeferred();
      const executionOrder: string[] = [];

      const promise1 = sut.enqueue('batch-1', async () => {
        executionOrder.push('first-start');
        await deferred.promise;
        executionOrder.push('first-end');
      });

      const promise2 = sut.enqueue('batch-2', async () => {
        executionOrder.push('second');
      });

      // At this point, first job is running but blocked, second is waiting
      // Give microtasks time to settle
      await Promise.resolve();

      expect(executionOrder).toEqual(['first-start']);
      expect(sut.isBusy()).toBe(true);

      // Unblock the first job
      deferred.resolve();
      await Promise.all([promise1, promise2]);

      expect(executionOrder).toEqual(['first-start', 'first-end', 'second']);
    });

    it('when a job fails, then the next job still executes', async () => {
      const error = new Error('batch-1 failed');
      const secondJobExecuted = jest.fn();

      const promise1 = sut.enqueue('batch-1', async () => {
        throw error;
      });

      const promise2 = sut.enqueue('batch-2', async () => {
        secondJobExecuted();
      });

      await expect(promise1).rejects.toBe(error);
      await promise2;

      expect(secondJobExecuted).toHaveBeenCalledTimes(1);
    });

    it('when multiple jobs fail, then all subsequent jobs still execute', async () => {
      const executionOrder: string[] = [];

      const promise1 = sut.enqueue('batch-1', async () => {
        executionOrder.push('first');
        throw new Error('fail-1');
      });

      const promise2 = sut.enqueue('batch-2', async () => {
        executionOrder.push('second');
        throw new Error('fail-2');
      });

      const promise3 = sut.enqueue('batch-3', async () => {
        executionOrder.push('third');
      });

      await promise1.catch(() => undefined);
      await promise2.catch(() => undefined);
      await promise3;

      expect(executionOrder).toEqual(['first', 'second', 'third']);
    });
  });

  describe('When checking queue state', () => {
    it('when no jobs are running, then isBusy returns false', () => {
      expect(sut.isBusy()).toBe(false);
    });

    it('when a job is running, then isBusy returns true', () => {
      const deferred = createDeferred();

      sut.enqueue('batch-1', () => deferred.promise);

      expect(sut.isBusy()).toBe(true);

      deferred.resolve();
    });

    it('when all jobs complete, then isBusy returns false', async () => {
      await sut.enqueue('batch-1', async () => { return; });

      expect(sut.isBusy()).toBe(false);
    });

    it('when no jobs are pending, then getPendingCount returns 0', () => {
      expect(sut.getPendingCount()).toBe(0);
    });

    it('when jobs are waiting behind an active job, then getPendingCount returns the correct count', () => {
      const deferred = createDeferred();

      sut.enqueue('batch-1', () => deferred.promise);
      sut.enqueue('batch-2', async () => { return; });
      sut.enqueue('batch-3', async () => { return; });

      // batch-1 is active, batch-2 and batch-3 are pending
      expect(sut.getPendingCount()).toBe(2);

      deferred.resolve();
    });

    it('when all jobs complete, then getPendingCount returns 0', async () => {
      const promise1 = sut.enqueue('batch-1', async () => { return; });
      const promise2 = sut.enqueue('batch-2', async () => { return; });

      await Promise.all([promise1, promise2]);

      expect(sut.getPendingCount()).toBe(0);
    });
  });

  describe('When clearing the pending queue', () => {
    it('when clearPending is called, then waiting jobs are removed from the queue', () => {
      const deferred = createDeferred();

      sut.enqueue('batch-1', () => deferred.promise);
      sut.enqueue('batch-2', async () => { return; });
      sut.enqueue('batch-3', async () => { return; });

      expect(sut.getPendingCount()).toBe(2);

      sut.clearPending();

      expect(sut.getPendingCount()).toBe(0);

      deferred.resolve();
    });

    it('when clearPending is called, then the active job continues running to completion', async () => {
      const deferred = createDeferred();
      const activeJobCompleted = jest.fn();

      const promise1 = sut.enqueue('batch-1', async () => {
        await deferred.promise;
        activeJobCompleted();
      });

      sut.enqueue('batch-2', async () => { return; });

      sut.clearPending();

      // Active job should still be running
      expect(sut.isBusy()).toBe(true);

      deferred.resolve();
      await promise1;

      expect(activeJobCompleted).toHaveBeenCalledTimes(1);
    });

    it('when clearPending is called, then cleared jobs never execute', async () => {
      const deferred = createDeferred();
      const clearedJobExecuted = jest.fn();

      const promise1 = sut.enqueue('batch-1', () => deferred.promise);

      // These will be cleared
      sut.enqueue('batch-2', async () => {
        clearedJobExecuted();
      });
      sut.enqueue('batch-3', async () => {
        clearedJobExecuted();
      });

      sut.clearPending();

      deferred.resolve();
      await promise1;

      // Give microtasks time to settle in case something would try to run
      await new Promise((r) => setTimeout(r, 50));

      expect(clearedJobExecuted).not.toHaveBeenCalled();
    });
  });

  describe('When handling concurrent enqueue calls', () => {
    it('when two jobs are enqueued simultaneously, then both complete and resolve independently', async () => {
      const deferred1 = createDeferred();
      const deferred2 = createDeferred();

      let result1Resolved = false;
      let result2Resolved = false;

      const promise1 = sut.enqueue('batch-1', () => deferred1.promise).then(() => {
        result1Resolved = true;
      });

      const promise2 = sut.enqueue('batch-2', () => deferred2.promise).then(() => {
        result2Resolved = true;
      });

      // Complete first job
      deferred1.resolve();
      await promise1;

      expect(result1Resolved).toBe(true);
      expect(result2Resolved).toBe(false);

      // Complete second job
      deferred2.resolve();
      await promise2;

      expect(result2Resolved).toBe(true);
    });

    it('when a failing job is followed by a succeeding job, then each promise settles correctly', async () => {
      const error = new Error('first failed');

      const promise1 = sut.enqueue('batch-1', async () => {
        throw error;
      });

      const promise2 = sut.enqueue('batch-2', async () => {
        // success
      });

      await expect(promise1).rejects.toBe(error);
      await expect(promise2).resolves.toBeUndefined();
    });
  });
});
