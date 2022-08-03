import { Auth, Drive, photos } from '@internxt/sdk';
import { constants } from '../AppService';
import packageJson from '../../../package.json';
import { ApiSecurity } from '@internxt/sdk/dist/shared';

export type SdkManagerApiSecurity = ApiSecurity & { photosToken: string };
/**
 * Manages all the sdk submodules initialization
 * based on the current apiSecurity details
 */
export class SdkManager {
  private static apiSecurity?: SdkManagerApiSecurity = undefined;
  private static instance: SdkManager = new SdkManager();
  /**
   *  Sets the security details needed to create SDK clients
   * @param apiSecurity Security properties to be setted
   */
  static init(apiSecurity: SdkManagerApiSecurity) {
    SdkManager.setApiSecurity(apiSecurity);
  }

  static setApiSecurity(apiSecurity: SdkManagerApiSecurity) {
    SdkManager.apiSecurity = apiSecurity;
  }

  static clean() {
    SdkManager.apiSecurity = undefined;
  }

  static getInstance() {
    if (!SdkManager.instance) {
      throw new Error('No instance found, call init method first');
    }
    return SdkManager.instance;
  }

  public getApiSecurity(): SdkManagerApiSecurity {
    if (!SdkManager.apiSecurity) throw new Error('Api security properties not found in SdkManager');

    return SdkManager.apiSecurity;
  }

  /** Auth SDK */
  get auth() {
    return Auth.client(
      `${constants.REACT_NATIVE_DRIVE_API_URL}/api`,
      {
        clientName: packageJson.name,
        clientVersion: packageJson.version,
      },
      this.getApiSecurity(),
    );
  }
  /** Payments SDK */
  get payments() {
    return Drive.Payments.client(
      `${constants.REACT_NATIVE_PAYMENTS_API_URL}`,
      {
        clientName: packageJson.name,
        clientVersion: packageJson.version,
      },
      {
        // Weird, normal accessToken doesn't work here
        token: this.getApiSecurity().photosToken,
        mnemonic: this.getApiSecurity().mnemonic,
      },
    );
  }

  /** Users SDK */
  get users() {
    return Drive.Users.client(
      `${constants.REACT_NATIVE_DRIVE_API_URL}/api`,
      {
        clientName: packageJson.name,
        clientVersion: packageJson.version,
      },
      this.getApiSecurity(),
    );
  }

  /** Referrals SDK */
  get referrals() {
    return Drive.Referrals.client(
      `${constants.REACT_NATIVE_DRIVE_API_URL}/api`,
      {
        clientName: packageJson.name,
        clientVersion: packageJson.version,
      },
      this.getApiSecurity(),
    );
  }

  /** Storage SDK */
  get storage() {
    return Drive.Storage.client(
      `${constants.REACT_NATIVE_DRIVE_API_URL}/api`,
      {
        clientName: packageJson.name,
        clientVersion: packageJson.version,
      },
      this.getApiSecurity(),
    );
  }

  /** Photos SDK */
  get photos() {
    return new photos.Photos(constants.REACT_NATIVE_PHOTOS_API_URL, this.getApiSecurity().photosToken);
  }
}
