import { BaseLogger } from '../../common/logger';

export class DriveLogger extends BaseLogger {
  constructor() {
    super({
      tag: 'DRIVE',
    });
  }
}

export const driveLogger = new DriveLogger();
