import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import Axios from 'axios';
import { getHeaders } from '../../helpers/headers';
import { DriveServiceModel } from '../../types/drive';
import { constants } from '../AppService';
import DriveLogService from './DriveLogService';

class DriveRecentsService {
  constructor(private readonly model: DriveServiceModel, private readonly logService: DriveLogService) {}

  public async getRecents(): Promise<DriveFileData[]> {
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    const response = await Axios.get(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/storage/recents`, {
      headers: headersMap,
    });

    return response.data;
  }
}

export default DriveRecentsService;
