export abstract class RunnableService<T = unknown> {
  // Should resume the RunnableService
  abstract resume(): void;

  // Should pause the RunnableService
  abstract pause(): void;

  // Should update the RunnableService current status
  abstract updateStatus(status: T): void;
}
