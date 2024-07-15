import { Auth, Drive, photos } from '@internxt/sdk';
import appService, { constants } from '../../AppService';
import packageJson from '../../../../package.json';
import { ApiSecurity } from '@internxt/sdk/dist/shared';
import { Trash } from '@internxt/sdk/dist/drive';

export type SdkManagerApiSecurity = ApiSecurity & { newToken: string };
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

  public getApiSecurity(config = { throwErrorOnMissingCredentials: true }): SdkManagerApiSecurity {
    if (!SdkManager.apiSecurity && config.throwErrorOnMissingCredentials)
      throw new Error('Api security properties not found in SdkManager');

    return SdkManager.apiSecurity as SdkManagerApiSecurity;
  }

  /** Auth SDK */
  get authV2() {
    return Auth.client(
      constants.DRIVE_NEW_API_URL,
      {
        clientName: packageJson.name,
        clientVersion: appService.version,
      },
      this.getApiSecurity({ throwErrorOnMissingCredentials: false }),
    );
  }

  /** Auth old client SDK */
  get auth() {
    return Auth.client(
      constants.DRIVE_API_URL,
      {
        clientName: packageJson.name,
        clientVersion: appService.version,
      },
      this.getApiSecurity({ throwErrorOnMissingCredentials: false }),
    );
  }
  /** Payments SDK */
  get payments() {
    return Drive.Payments.client(
      constants.PAYMENTS_API_URL,
      {
        clientName: packageJson.name,
        clientVersion: appService.version,
      },
      {
        // Weird, normal accessToken doesn't work here
        token: this.getApiSecurity().newToken,
      },
    );
  }

  /** Users SDK */
  get users() {
    return Drive.Users.client(
      constants.DRIVE_API_URL,
      {
        clientName: packageJson.name,
        clientVersion: appService.version,
      },
      this.getApiSecurity({ throwErrorOnMissingCredentials: false }),
    );
  }

  /** Storage SDK */
  get storage() {
    return Drive.Storage.client(
      constants.DRIVE_API_URL,
      {
        clientName: packageJson.name,
        clientVersion: appService.version,
      },
      this.getApiSecurity(),
    );
  }

  /** Trash SDK */
  get trash() {
    return Trash.client(
      constants.DRIVE_NEW_API_URL,
      {
        clientName: packageJson.name,
        clientVersion: appService.version,
      },
      {
        token: this.getApiSecurity().newToken,
      },
    );
  }

  /** Share SDK */
  get share() {
    // Uses V2 API
    return Drive.Share.client(
      constants.DRIVE_NEW_API_URL,
      {
        clientName: packageJson.name,
        clientVersion: appService.version,
      },
      {
        token: this.getApiSecurity().newToken,
      },
    );
  }
}
