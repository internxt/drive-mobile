import * as Sentry from 'sentry-expo';
import appService from './app';

class SentryService {
  constructor() {
    Sentry.init({
      dsn: appService.constants.REACT_NATIVE_SENTRY_DSN,
      debug: appService.constants.REACT_NATIVE_DEBUG,
    });
  }
}

export default new SentryService();
