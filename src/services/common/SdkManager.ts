import { Auth, Drive } from '@internxt/sdk';
import { constants } from '../AppService';
import packageJson from '../../../package.json';
import { ApiSecurity } from '@internxt/sdk/dist/shared';

/**
 * Manages all the sdk submodules initialization
 * based on the current apiSecurity details
 */
export class SdkManager {
  private static apiSecurity?: ApiSecurity = undefined;
  private static instance: SdkManager = new SdkManager();
  /**
   *  Sets the security details needed to create SDK clients
   * @param apiSecurity Security properties to be setted
   */
  static init(apiSecurity: ApiSecurity) {
    SdkManager.setApiSecurity(apiSecurity);
  }

  static setApiSecurity(apiSecurity: ApiSecurity) {
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

  private getApiSecurity(): ApiSecurity {
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
      this.getApiSecurity(),
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
}
