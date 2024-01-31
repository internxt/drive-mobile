import { logger as RNLogger, consoleTransport, fileAsyncTransport } from 'react-native-logs';
import RNFS from 'react-native-fs';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { InteractionManager } from 'react-native';

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
    this.logger.info(args.join(' '));
  }

  public warn(...args: unknown[]): void {
    if (this.options.disabled) return;
    this.logger.warn(args.join(' '));
  }

  public error(...args: unknown[]): void {
    if (this.options.disabled) return;

    this.logger.error(args.join(' '));
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
