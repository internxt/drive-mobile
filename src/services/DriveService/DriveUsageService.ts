import Axios from 'axios';
import { DriveServiceModel } from 'src/types/drive';
import { constants } from '../AppService';

export default class DriveUsageService {
  private readonly model: DriveServiceModel;

  constructor(model: DriveServiceModel) {
    this.model = model;
  }

  public async getUsage(): Promise<number> {
    const response = await Axios.get<{ total: number }>(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/usage`, {
      headers: {
        Authorization: `Bearer ${this.model.accessToken}`,
      },
    });

    return response.data.total;
  }
}
