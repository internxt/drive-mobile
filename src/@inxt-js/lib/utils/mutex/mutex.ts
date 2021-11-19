export class Mutex {
  private mutex = Promise.resolve();

  lock(): PromiseLike<() => void> {
    let begin: (unlock: () => void) => void;

    this.mutex = this.mutex.then(() => new Promise(begin));

    return new Promise((res) => (begin = res));
  }

  async dispatch(fn: (() => void) | (() => PromiseLike<void>)): Promise<void> {
    const unlock = await this.lock();

    try {
      return await Promise.resolve(fn());
    } finally {
      unlock();
    }
  }
}
