import * as Sentry from 'sentry-expo';
import appService from '../services/AppService';
import { AppPlugin } from '../types';

const sentryPlugin: AppPlugin = {
  install(): void {
    Sentry.init({
      dsn: appService.constants.SENTRY_DSN,
      debug: false,
    });
  },
};

export default sentryPlugin;
