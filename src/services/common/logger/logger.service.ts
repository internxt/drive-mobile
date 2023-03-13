import { logger as RNLogger, consoleTransport, fileAsyncTransport } from 'react-native-logs';
import RNFS from 'react-native-fs';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { InteractionManager } from 'react-native';

const defaultLogger = () => {
  return RNLogger.createLogger({
    async: true,
    transport: __DEV__ ? consoleTransport : fileAsyncTransport,
    asyncFunc: InteractionManager.runAfterInteractions,
    transportOptions: {
      FS: RNFS,
      fileName: fs.getRuntimeLogsFileName(),
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

  public info(arg: unknown): void {
    if (this.options.disabled) return;
    this.logger.info(arg instanceof Error ? arg.message : arg);
  }

  public warn(arg: unknown): void {
    if (this.options.disabled) return;
    this.logger.warn(arg instanceof Error ? arg.message : arg);
  }

  public error(arg: unknown): void {
    if (this.options.disabled) return;

    this.logger.error(arg instanceof Error ? arg.message : arg);
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
