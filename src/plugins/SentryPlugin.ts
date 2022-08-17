import * as Sentry from 'sentry-expo';
import { appService } from '@internxt-mobile/services/common';
import { AppPlugin } from '../types';

const sentryPlugin: AppPlugin = {
  install(): void {
    Sentry.init({
      dsn: appService.constants.SENTRY_DSN,
      debug: __DEV__,
      release: appService.constants.RELEASE_ID,
    });
  },
};

export default sentryPlugin;
