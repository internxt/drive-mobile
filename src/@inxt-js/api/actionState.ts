import { DOWNLOAD_CANCELLED, UPLOAD_CANCELLED } from './constants';
import { EventEmitter } from '../lib/utils/eventEmitter';

export enum ActionTypes {
  Download = 'DOWNLOAD',
  Upload = 'UPLOAD'
}

export class ActionState extends EventEmitter {
  private type: ActionTypes;

  constructor(type: ActionTypes) {
    super();

    this.type = type;
  }

  public stop(): void {
    if (this.type === ActionTypes.Download) {
      this.emit(DOWNLOAD_CANCELLED);
    }

    if (this.type === ActionTypes.Upload) {
      this.emit(UPLOAD_CANCELLED);
    }
  }
}