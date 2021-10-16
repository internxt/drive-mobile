type Event = string;
type Listener = (...args: any[]) => any;
type Listeners = Array<Listener>;

export class EventEmitter {
  private events: Map<Event, Listeners> = new Map();

  on(event: Event, listener: Listener): void {
    if (this.events.has(event)) {
      this.events.set(event, this.events.get(event).concat([listener]));
      return;
    }
    this.events.set(event, [listener]);
  }

  once(event: Event, listener: Listener): void {
    const autoremoveListener = (...args) => {
      listener.apply(listener, ...args);
      this.removeListener(event, listener);
    };

    if (this.events.has(event)) {
      this.events.set(event, this.events.get(event).concat(autoremoveListener));
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

  emit(event: Event, ...args): void {
    if (this.events.has(event)) {
      this.events.get(event).forEach((listener) => {
        listener.apply(listener, args);
      });
    }
  }

  listenerCount(event: Event): number {
    return this.events.get(event).length;
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
    this.events.set(event, this.events.get(event).filter((l) => l !== listener));
  }
}