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
export const sleep = async (sleepTimeInMs: number) => new Promise((resolve) => setTimeout(resolve, sleepTimeInMs));
