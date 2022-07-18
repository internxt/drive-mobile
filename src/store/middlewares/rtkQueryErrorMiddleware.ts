import { Middleware, isRejected } from '@reduxjs/toolkit';
import { AnyAction } from 'redux';
import sentryService from '../../services/SentryService';

export const rtkQueryErrorMiddleware: Middleware = () => (next) => (action: AnyAction) => {
  if (isRejected(action) && !action.meta.aborted) {
    sentryService.native.captureException(new Error(action.error.message), { extra: action });
  }

  return next(action);
};
