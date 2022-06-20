export abstract class RunnableService<T> {
  // Should run the RunnableService
  abstract run(): void;

  // Should pause the RunnableService
  abstract pause(): void;

  // Should update the RunnableService current status
  abstract updateStatus(status: T): void;

  // Should destroy and start the service again
  abstract restart(): void;

  // Should destroy the service and return it to the initial state
  abstract destroy(): void;
}
