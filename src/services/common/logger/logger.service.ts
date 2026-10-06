import * as RNFS from '@dr.pogodin/react-native-fs';
import { logger as RNLogger, consoleTransport, fileAsyncTransport } from 'react-native-logs';

import { fs } from '@internxt-mobile/services/FileSystemService';
import { InteractionManager } from 'react-native';

/**
 * Serializes a single logger argument to a readable string. An error is written as its stack,
 * which already opens with its message, or as its message alone when it has no stack. An object or
 * an array is written as JSON, with nested errors expanded the same way and circular references
 * rendered as `[Circular]`. Any other value is written as its string form.
 *
 * @param logValue - The value passed to `logger.info`, `logger.warn` or `logger.error`.
 * @returns The value as a string.
 */
const serializeLogArg = (logValue: unknown): string => {
  if (typeof logValue === 'string') {
    return logValue;
  }
  if (logValue instanceof Error) {
    return logValue.stack ?? logValue.message;
  }
  if (logValue !== null && typeof logValue === 'object') {
    const ancestors: unknown[] = [];
    try {
      return JSON.stringify(logValue, function (this: unknown, _key: string, value: unknown) {
        const serializableValue = value instanceof Error ? { message: value.message, stack: value.stack } : value;
        if (serializableValue === null || typeof serializableValue !== 'object') {
          return serializableValue;
        }
        while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
          ancestors.pop();
        }
        if (ancestors.includes(serializableValue)) {
          return '[Circular]';
        }
        ancestors.push(serializableValue);

        return serializableValue;
      });
    } catch {
      return String(logValue);
    }
  }

  return String(logValue);
};

/**
 * Serializes the arguments of a log call into the single line written to the transport.
 *
 * @param args - The values passed to `logger.info`, `logger.warn` or `logger.error`.
 * @returns The serialized values, separated by spaces.
 */
export const formatLogArgs = (args: unknown[]): string => args.map(serializeLogArg).join(' ');

const defaultLogger = () => {
  return RNLogger.createLogger({
    async: !__DEV__,
    transport: __DEV__ ? consoleTransport : fileAsyncTransport,
    asyncFunc: InteractionManager.runAfterInteractions,
    transportOptions: {
      FS: __DEV__ ? undefined : RNFS,
      fileName: __DEV__ ? undefined : fs.getRuntimeLogsFileName(),
    },
  });
};

export interface BaseLoggerOptions {
  tag: string;
  disabled?: boolean;
}
export class BaseLogger {
  private options: BaseLoggerOptions;
  private logger: {
    [x: string]: (...args: unknown[]) => void;
  };
  constructor(options: BaseLoggerOptions) {
    this.logger = defaultLogger().extend(options.tag);
    this.options = options;
  }

  public info(...args: unknown[]): void {
    if (this.options.disabled) return;
    this.logger.info(formatLogArgs(args));
  }

  public warn(...args: unknown[]): void {
    if (this.options.disabled) return;
    this.logger.warn(formatLogArgs(args));
  }

  public error(...args: unknown[]): void {
    if (this.options.disabled) return;

    this.logger.error(formatLogArgs(args));
  }
}

export class DefaultLogger extends BaseLogger {
  constructor() {
    super({
      tag: 'APP',
    });
  }
}

export const logger = new DefaultLogger();
