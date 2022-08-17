import { appService } from '../app';

export interface BaseLoggerOptions {
  prefix: string;
  enabled?: boolean;
}
export class BaseLogger {
  private options: BaseLoggerOptions;
  constructor(options: BaseLoggerOptions) {
    this.options = {
      ...options,
      enabled: options.enabled === undefined ? appService.isDev() : options.enabled,
    };
  }

  public info(message: string): void {
    // eslint-disable-next-line no-console
    this.options.enabled && console.log(`[${this.options.prefix}]:` + message);
  }

  public warn(message: string): void {
    // eslint-disable-next-line no-console
    this.options.enabled && console.warn(`[${this.options.prefix}]:` + message);
  }

  public error(message: string): void {
    // eslint-disable-next-line no-console
    this.options.enabled && console.error(`[${this.options.prefix}]:` + message);
  }
}

export class DefaultLogger extends BaseLogger {
  constructor() {
    super({
      prefix: 'APP',
    });
  }
}
