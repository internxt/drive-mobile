import { DriveServiceModel } from '../../types/drive';
import { constants } from '../app';
import DriveEventEmitter from './DriveEventEmitter';
import DriveLogService from './DriveLogService';

class DriveService {
  public readonly model: DriveServiceModel;
  public readonly eventEmitter: DriveEventEmitter;
  public readonly logService: DriveLogService;

  constructor() {
    this.model = {
      debug: constants.REACT_NATIVE_DEBUG,
    };
    this.logService = new DriveLogService(this.model);
    this.eventEmitter = new DriveEventEmitter(this.logService);
  }
}

const driveService = new DriveService();
export default driveService;
