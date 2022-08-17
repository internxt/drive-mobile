import { ReportableError, ReportableErrorOptions } from './base';

export class DisplayableError extends ReportableError {
  public userFriendlyMessage: string;
  constructor(options: { userFriendlyMessage: string; report?: ReportableErrorOptions }) {
    super(options.report);
    this.userFriendlyMessage = options.userFriendlyMessage;
  }
}
