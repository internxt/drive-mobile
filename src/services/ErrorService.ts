import strings from '../../assets/lang/strings';
import AppError from '../types';
import { HTTP_TOO_MANY_REQUESTS } from './common';
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

export type CastErrorContext = 'upload' | 'download' | 'content';

class ErrorService {
  private logger = new SentryLogger();
  public setGlobalErrorContext(globalContext: Partial<GlobalErrorContext>) {
    // sentryService.native.setUser({
    //   email: globalContext.email,
    //   id: globalContext.userId,
    // });
  }

  /**
   * Converts errors from different formats to a consistent and user-friendly AppError.
   *
   * @param err - Error in any format (Axios, API, JavaScript, etc.)
   * @param context - Optional context for specific rate limit messages
   *
   * @returns AppError with user-friendly message and status code (if available)
   */
  public castError(err: unknown, context?: CastErrorContext): AppError {
    if (err && typeof err === 'object') {
      const map = err as Record<string, unknown>;

      const status = this.extractStatus(map);
      const message = this.extractMessage(map);

      if (status === HTTP_TOO_MANY_REQUESTS) {
        const rateLimitMessage = this.getRateLimitMessage(context);
        return new AppError(rateLimitMessage, status);
      }

      const isServerReturnedError =
        typeof message === 'string' &&
        message.trim().length > 0 &&
        typeof status === 'number' &&
        status >= 400 &&
        status < 600;

      if (isServerReturnedError) {
        return new AppError(message, status);
      }
    }

    return new AppError(strings.errors.genericError);
  }

  /**
   * Extract status from error object, checking multiple possible locations:
   * - error.status (direct)
   * - error.response.status (axios format)
   */
  private extractStatus(err: Record<string, unknown>): number | undefined {
    const directStatus = this.parseStatus(err.status);
    if (directStatus !== undefined) {
      return directStatus;
    }

    const response = err.response as Record<string, unknown> | undefined;
    if (response) {
      const responseStatus = this.parseStatus(response.status);
      if (responseStatus !== undefined) {
        return responseStatus;
      }
    }

    return undefined;
  }

  /**
   * Parse a status value that can be either a number or a string.
   * Returns undefined if the value cannot be parsed as a valid HTTP status code.
   */
  private parseStatus(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return this.isValidHttpStatus(value) ? value : undefined;
    }

    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return !Number.isNaN(parsed) && this.isValidHttpStatus(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  /**
   * Check if a number is a valid HTTP status code (100-599)
   */
  private isValidHttpStatus(status: number): boolean {
    return status >= 100 && status < 600;
  }

  /**
   * Extract message from error object, checking multiple possible locations
   */
  private extractMessage(err: Record<string, unknown>): string {
    if (typeof err.message === 'string' && err.message.trim().length > 0) {
      return err.message;
    }

    const response = err.response as Record<string, unknown> | undefined;
    const responseData = response?.data as Record<string, unknown> | undefined;
    if (responseData && typeof responseData.message === 'string') {
      return responseData.message;
    }

    return '';
  }

  private getRateLimitMessage(context?: CastErrorContext): string {
    switch (context) {
      case 'upload':
        return strings.errors.rateLimitUpload;
      case 'download':
        return strings.errors.rateLimitDownload;
      case 'content':
        return strings.errors.rateLimitContent;
      default:
        return strings.errors.rateLimitReached;
    }
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
