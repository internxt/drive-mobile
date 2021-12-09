type Event = string;
type Listener = (...args: any[]) => any;
type Listeners = Array<Listener>;

export class EventEmitter {
  private events: Map<Event, Listeners> = new Map();

  on(event: Event, listener: Listener): void {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)?.concat([listener]);

      listeners && this.events.set(event, listeners);
      return;
    }
    this.events.set(event, [listener]);
  }

  once(event: Event, listener: Listener): void {
    const autoremoveListener = (...args: any[]) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      listener.apply(listener, ...args);
      this.removeListener(event, listener);
    };

    if (this.events.has(event)) {
      const listeners = this.events.get(event)?.concat(autoremoveListener);
      listeners && this.events.set(event, listeners);
      return;
    }
    this.events.set(event, [autoremoveListener]);
  }

  getListeners(event: string): Listeners {
    return this.events.get(event) ?? [];
  }

  eventsCount(): number {
    return this.events.size;
  }

  emit(event: Event, ...args: any[]): void {
    if (this.events.has(event)) {
      this.events.get(event)?.forEach((listener) => {
        listener.apply(listener, args);
      });
    }
  }

  listenerCount(event: Event): number {
    return this.events.get(event)?.length || 0;
  }

  removeAllListeners(): void {
    if (this.events.size === 0) {
      return;
    }
    this.events = new Map();
  }

  removeListener(event: Event, listener: Listener): void {
    if (!this.events.has(event)) {
      return;
    }

    const listeners = this.events.get(event)?.filter((l) => l !== listener);

    listeners && this.events.set(event, listeners);
  }
}
