import errorService, { ErrorContext } from 'src/services/ErrorService';

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

export class DisplayableError extends ReportableError {
  public userFriendlyMessage: string;
  constructor({ userFriendlyMessage, errorToReport }: { userFriendlyMessage: string; errorToReport?: Error }) {
    super({
      error: errorToReport,
    });

    this.userFriendlyMessage = userFriendlyMessage;
  }
}
