import { Middleware, isRejected } from '@reduxjs/toolkit';
import { AnyAction } from 'redux';
import { errorService } from '@internxt-mobile/services/common';

export const rtkQueryErrorMiddleware: Middleware = () => (next) => (action: AnyAction) => {
  if (isRejected(action) && !action.meta.aborted) {
    errorService.reportError(new Error((action.error.message || 'UNKNOWN_ERROR').toString()), { extra: action });
  }

  return next(action);
};
