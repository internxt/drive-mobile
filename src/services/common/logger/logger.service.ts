import appService from '@internxt-mobile/services/AppService';

export interface BaseLoggerOptions {
  tag: string;
  enabled?: boolean;
}
export class BaseLogger {
  private options: BaseLoggerOptions;
  constructor(options: BaseLoggerOptions) {
    this.options = {
      ...options,
      enabled: options.enabled === undefined ? appService.isDevMode : options.enabled,
    };
  }

  public info(message: string): void {
    // eslint-disable-next-line no-console
    this.options.enabled && console.log(`[${this.options.tag}]:` + message);
  }

  public warn(message: string): void {
    // eslint-disable-next-line no-console
    this.options.enabled && console.warn(`[${this.options.tag}]:` + message);
  }

  public error(message: string): void {
    // eslint-disable-next-line no-console
    this.options.enabled && console.error(`[${this.options.tag}]:` + message);
  }
}

export class DefaultLogger extends BaseLogger {
  constructor() {
    super({
      tag: 'APP',
    });
  }
}
