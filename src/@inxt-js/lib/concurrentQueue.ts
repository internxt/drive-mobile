import { QueueObject, queue, ErrorCallback } from 'async';

export class ConcurrentQueue<K> {
  private totalTasks: number;
  protected concurrency: number;
  private finishedTasks = 0;
  protected queue: QueueObject<K>;

  constructor(concurrency = 1, totalTasks = 1, task?: (content: K) => Promise<void>) {
    if (concurrency > totalTasks) {
      throw new Error('ConcurrentQueue error: Concurrency can not be greater than total tasks to perform');
    }

    this.totalTasks = totalTasks;
    this.concurrency = concurrency;

    if (task) {
      this.queue = queue(async (content: K, cb: ErrorCallback<Error>) => {
        task(content).then(() => {
          this.finishedTasks++;
          cb();
        }).catch(cb);
      }, concurrency);
    } else {
      this.queue = queue(() => { }, 1);
    }
  }

  setQueueTask(task: (content: K) => Promise<void>): void {
    this.queue = queue(async (content: K, cb: ErrorCallback<Error>) => {
      task(content).then(() => {
        this.finishedTasks++;
        cb();
      }).catch(cb);
    }, this.concurrency);
  }

  push(content: K): Promise<K> {
    return this.queue.push(content);
  }

  end(cb?: () => void): void | Promise<void> {
    if (cb) {
      const intervalId = setInterval(() => {
        if (this.totalTasks === this.finishedTasks) {
          clearInterval(intervalId);
          cb();
        }
      }, 500);
    } else {
      return new Promise((r) => {
        const intervalId = setInterval(() => {
          if (this.totalTasks === this.finishedTasks) {
            clearInterval(intervalId);
            r();
          }
        }, 500);
      });
    }
  }
}
