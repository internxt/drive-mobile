import AppError from '../types';
import { BaseLogger } from './common';
import sentryService from './SentryService';

export interface GlobalErrorContext {
  email: string;
  userId: string;
}

class SentryLogger extends BaseLogger {
  constructor() {
    super({
      tag: 'TRACKED_ON_SENTRY',
    });
  }
}

export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
export interface ErrorContext extends GlobalErrorContext {
  level: SeverityLevel;
  // Tagname and value of the tag such environment: dev or things like that
  tags: { [tagName: string]: string };
  extra?: Record<string, unknown>;
}
class ErrorService {
  private logger = new SentryLogger();
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

  public reportError(error: Error | unknown, context: Partial<ErrorContext> = {}) {
    this.log(context.level || 'error', error);
    if (!__DEV__) {
      sentryService.native.captureException(error, {
        level: context.level || 'error',
        tags: context.tags,
        extra: context.extra,
      });
    }
  }

  private log(level: SeverityLevel, message: unknown) {
    if (level === 'info') {
      this.logger.info(message);
    }

    if (level === 'warning') {
      this.logger.warn(message);
    }

    this.logger.error(message);
  }
}

const errorService = new ErrorService();
export default errorService;
