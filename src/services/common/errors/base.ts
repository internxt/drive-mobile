import { ErrorContext, errorService } from '@internxt-mobile/services/common';

export interface ReportableErrorOptions {
  error: unknown;
  context?: ErrorContext;
}
export class ReportableError extends Error {
  private options?: ReportableErrorOptions;
  constructor(options?: ReportableErrorOptions) {
    super(options ? (options.error as Error).message : 'NO_MESSAGE');
    this.options = options;
    this.init();
  }

  private init() {
    if (this.options) {
      errorService.reportError(this.options.error as Error, this.options.context || {});
    }
  }
}
