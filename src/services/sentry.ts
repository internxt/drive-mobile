import * as Sentry from 'sentry-expo';
import appService from './app';

class SentryService {
  public readonly native: typeof Sentry.Native;

  constructor() {
    Sentry.init({
      dsn: appService.constants.SENTRY_DSN,
      debug: appService.constants.REACT_NATIVE_DEBUG,
    });

    this.native = Sentry.Native;
  }
}

const sentryService = new SentryService();
export default sentryService;
