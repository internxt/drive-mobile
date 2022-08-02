import { DriveServiceModel } from '../../types/drive';
import { constants } from '../AppService';
import { SdkManager } from '../common/SdkManager';
import DriveEventEmitter from './DriveEventEmitter';
import DriveLocalDatabaseService from './DriveLocalDatabaseService';
import DriveLogService from './DriveLogService';
import DriveRecentsService from './DriveRecentsService';
import DriveShareService from './DriveShareService';
import DriveUsageService from './DriveUsageService';

class DriveService {
  public readonly model: DriveServiceModel;
  public readonly log: DriveLogService;
  public readonly eventEmitter: DriveEventEmitter;
  public readonly localDatabase: DriveLocalDatabaseService;
  public readonly share: DriveShareService;
  public readonly recents: DriveRecentsService;
  public readonly usage: DriveUsageService;

  constructor(sdk: SdkManager) {
    this.model = {
      debug: constants.REACT_NATIVE_DEBUG,
    };
    this.log = new DriveLogService(this.model);
    this.eventEmitter = new DriveEventEmitter(this.log);
    this.localDatabase = new DriveLocalDatabaseService(this.log);
    this.share = new DriveShareService();
    this.recents = new DriveRecentsService(sdk);
    this.usage = new DriveUsageService(sdk);

    this.init();
  }

  public async init() {
    await this.localDatabase.init();
  }
}

export default new DriveService(SdkManager.getInstance());
