import { Middleware, isRejected } from '@reduxjs/toolkit';
import { AnyAction } from 'redux';

export const rtkQueryErrorMiddleware: Middleware = () => (next) => (action: AnyAction) => {
  if (isRejected(action) && !action.meta.aborted) {
    // TODO
  }

  return next(action);
};
