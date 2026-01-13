export abstract class RunnableService<T = unknown> {
  // Should resume the RunnableService
  abstract resume(): void;

  // Should pause the RunnableService
  abstract pause(): void;

  // Should update the RunnableService current status
  abstract updateStatus(status: T): void;
}

export class NotInitializedServiceError extends Error {
  private service: string;
  constructor(serviceName: string, where: string) {
    super();
    this.service = serviceName;
    this.message = `${this.service} not initialized in ${where}, check the stacktrace for more info`;
  }
}

// Waits x ms before resolving, useful to avoid RN bridge message collapse
export const sleep = (sleepTimeInMs: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), sleepTimeInMs));

// See https://inxt.atlassian.net/browse/PB-1446 to understand this piece of code
export const SLEEP_BECAUSE_MAYBE_BACKEND_IS_NOT_RETURNING_FRESHLY_MODIFIED_OR_CREATED_ITEMS_YET = sleep;
