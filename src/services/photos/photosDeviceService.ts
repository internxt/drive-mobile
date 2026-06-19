import { getHeaders } from 'src/helpers/headers';
import { constants } from 'src/services/AppService';
import { HTTP_CONFLICT, HTTP_NOT_FOUND } from 'src/services/common/httpStatusCodes';
import { SdkManager } from 'src/services/common/sdk/SdkManager';
import { PhotoDevice } from 'src/types/photos';
import { PhotoDeviceNameConflictError } from './errors';

const BASE_URL = `${constants.DRIVE_NEW_API_URL}/photos/devices`;

const headers = async (): Promise<Headers> => {
  const token = SdkManager.getInstance().getApiSecurity().newToken;
  return getHeaders(token);
};

const parseDevice = (raw: Record<string, unknown>): PhotoDevice => ({
  uuid: raw.uuid as string,
  plainName: raw.plainName as string,
  bucket: raw.bucket as string,
  status: raw.status as PhotoDevice['status'],
});

// TODO: pending use sdk
export const photosDeviceService = {
  async listDevices(): Promise<PhotoDevice[]> {
    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers: await headers(),
    });
    if (!response.ok) {
      throw new Error(`[photosDeviceService] listDevices failed: ${response.status}`);
    }
    const data: Record<string, unknown>[] = await response.json();
    return data.map(parseDevice);
  },

  async createDevice(deviceName: string): Promise<PhotoDevice> {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify({ deviceName }),
    });
    if (response.status === HTTP_CONFLICT) {
      throw new PhotoDeviceNameConflictError(deviceName);
    }
    if (!response.ok) {
      throw new Error(`[photosDeviceService] createDevice failed: ${response.status}`);
    }
    const data: Record<string, unknown> = await response.json();
    return parseDevice(data);
  },

  async getDevice(uuid: string): Promise<PhotoDevice | null> {
    const response = await fetch(`${BASE_URL}/${uuid}`, {
      method: 'GET',
      headers: await headers(),
    });
    if (response.status === HTTP_NOT_FOUND) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`[photosDeviceService] getDevice failed: ${response.status}`);
    }
    const data: Record<string, unknown> = await response.json();
    return parseDevice(data);
  },

  async deleteDevice(uuid: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/${uuid}`, {
      method: 'DELETE',
      headers: await headers(),
    });
    if (!response.ok) {
      throw new Error(`[photosDeviceService] deleteDevice failed: ${response.status}`);
    }
  },

  async renameDevice(uuid: string, deviceName: string): Promise<PhotoDevice> {
    const response = await fetch(`${BASE_URL}/${uuid}`, {
      method: 'PATCH',
      headers: await headers(),
      body: JSON.stringify({ deviceName }),
    });
    if (!response.ok) {
      throw new Error(`[photosDeviceService] renameDevice failed: ${response.status}`);
    }
    const data: Record<string, unknown> = await response.json();
    return parseDevice(data);
  },
};
