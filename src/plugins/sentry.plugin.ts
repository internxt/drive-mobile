import * as Sentry from 'sentry-expo';
import appService from '../services/app';
import { AppPlugin } from '../types';

const sentryPlugin: AppPlugin = {
  install(): void {
    Sentry.init({
      dsn: appService.constants.SENTRY_DSN,
      debug: appService.constants.REACT_NATIVE_DEBUG,
    });
  },
};

export default sentryPlugin;
