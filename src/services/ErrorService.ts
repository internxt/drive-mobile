import AppError from '../types';
import sentryService from './SentryService';
import { Severity } from '@sentry/react-native';

interface GlobalErrorContext {
  email: string;
  userId: string;
}

interface ErrorContext extends GlobalErrorContext {
  level: Severity;
  // Tagname and value of the tag such environment: dev or things like that
  tags: { [tagName: string]: string };
  extra?: Record<string, unknown>;
}
class ErrorService {
  public setGlobalErrorContext(globalContext: Partial<GlobalErrorContext>) {
    sentryService.native.setUser({
      email: globalContext.email,
      id: globalContext.userId,
    });
  }
  public castError(err: unknown): AppError {
    let castedError: AppError = new AppError('Unknown error');

    if (typeof err === 'string') {
      castedError = new AppError(err);
    } else if (err instanceof Error) {
      castedError.message = err.message;
    } else {
      const map = err as Record<string, unknown>;
      castedError = map.message ? new AppError(map.message as string, map.status as number) : castedError;
    }

    return castedError;
  }

  public reportError(error: Error, context: Partial<ErrorContext>) {
    if (!__DEV__) {
      sentryService.native.captureException(error, {
        level: context.level || Severity.Error,
        tags: context.tags,
        extra: context.extra,
      });
    } else {
      /**
       * On dev mode we log the error, and display it with [TRACKED] flag
       * so we know that error will be reported on production
       */
      this.log(context.level || Severity.Error, error);
    }
  }

  private log(level: Severity, ...messages: unknown[]) {
    if (level === Severity.Info) {
      // eslint-disable-next-line no-console
      return console.info('[TRACKED]', ...messages);
    }

    if (level === Severity.Warning) {
      // eslint-disable-next-line no-console
      return console.warn('[TRACKED]', ...messages);
    }

    // eslint-disable-next-line no-console
    return console.error('[TRACKED]', ...messages);
  }
}

const errorService = new ErrorService();
export default errorService;
