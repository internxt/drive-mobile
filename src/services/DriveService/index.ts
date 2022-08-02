import { NotInitializedServiceError } from 'src/helpers/services';
import { DriveServiceModel } from '../../types/drive';
import { constants } from '../AppService';
import DriveEventEmitter from './DriveEventEmitter';
import DriveLocalDatabaseService from './DriveLocalDatabaseService';
import DriveLogService from './DriveLogService';
import DriveRecentsService from './DriveRecentsService';
import DriveShareService from './DriveShareService';
import DriveUsageService from './DriveUsageService';

class DriveService {
  private static internalInstance: DriveService;

  public static get instance() {
    if (!this.internalInstance) {
      throw new NotInitializedServiceError('DriveService', 'class static method');
    }
    return this.internalInstance;
  }
  public readonly model: DriveServiceModel;
  public readonly log: DriveLogService;
  public readonly eventEmitter: DriveEventEmitter;
  public readonly localDatabase: DriveLocalDatabaseService;
  public readonly share: DriveShareService;
  public readonly recents: DriveRecentsService;
  public readonly usage: DriveUsageService;

  private constructor(accessToken: string) {
    this.model = {
      debug: constants.REACT_NATIVE_DEBUG,
      accessToken,
    };
    this.log = new DriveLogService(this.model);
    this.eventEmitter = new DriveEventEmitter(this.log);
    this.localDatabase = new DriveLocalDatabaseService(this.model, this.log);
    this.share = new DriveShareService(this.model, this.log);
    this.recents = new DriveRecentsService(this.model, this.log);
    this.usage = new DriveUsageService(this.model);
  }

  public static async initialize(accessToken: string) {
    DriveService.internalInstance = new DriveService(accessToken);
    await DriveService.instance.localDatabase.initialize();
  }
}

export default DriveService;
