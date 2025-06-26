import strings from '../../assets/lang/strings';
import AppError from '../types';
import { BaseLogger } from './common/logger';

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
    // sentryService.native.setUser({
    //   email: globalContext.email,
    //   id: globalContext.userId,
    // });
  }

  public castError(err: unknown): AppError {
    if (err && typeof err === 'object') {
      const map = err as Record<string, unknown>;

      const isServerReturnedError =
        typeof map.message === 'string' &&
        map.message.trim().length > 0 &&
        typeof map.status === 'number' &&
        map.status >= 400 &&
        map.status < 600;

      if (isServerReturnedError) {
        return new AppError(map.message as string, map.status as number);
      }
    }

    return new AppError(strings.errors.genericError);
  }

  public reportError = (error: Error | unknown, context: Partial<ErrorContext> = {}) => {
    this.log(context.level || 'error', error);
    if (!__DEV__) {
      // sentryService.native.captureException(error, {
      //   level: context.level || 'error',
      //   tags: context.tags,
      //   extra: context.extra,
      // });

      // We are going to add the error to the logger too, with the context
      const loggerMessage = (error as Error).message ? (error as Error).message : JSON.stringify(error);
      this.logger.error(`${loggerMessage} - Context: ${JSON.stringify(context, null, 2)}`);
    }
  };

  private log(level: SeverityLevel, message: unknown) {
    if (level === 'info') {
      this.logger.info(message);
    }

    if (level === 'warning') {
      this.logger.warn(message);
    }

    /**
     * RN has an utility called logbox that displays
     * the error in the app UI, tapping on the error
     * displays the stacktrace in the app and some other options
     * unluckily the logger.error does not map to console.error
     * so we display the error this way so we can view
     * it in the dev UI
     */
    // eslint-disable-next-line no-console
    console.error(message);
    this.logger.error(message);
  }
}

const errorService = new ErrorService();
export default errorService;
