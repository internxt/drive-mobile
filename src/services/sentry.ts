import * as Sentry from 'sentry-expo';

class SentryService {
  public readonly native: typeof Sentry.Native;

  constructor() {
    this.native = Sentry.Native;
  }
}

const sentryService = new SentryService();
export default sentryService;
