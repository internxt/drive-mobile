import { SecurityDetails, TwoFactorAuthQR } from '@internxt/sdk';
import { decryptText, encryptText, encryptTextWithKey, passToHash } from '../helpers';
import analytics, { AnalyticsEventKey } from './AnalyticsService';
import { getHeaders } from '../helpers/headers';
import { AsyncStorageKey, DevicePlatform } from '../types';
import asyncStorageService from './AsyncStorageService';
import { constants } from './AppService';
import AesUtils from '../helpers/aesUtils';
import EventEmitter from 'events';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkManager } from './common/sdk/SdkManager';

interface LoginResponse {
  tfa: string;
  sKey: string;
}

interface RegisterParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  captcha: string;
}

enum AuthEventKey {
  Login = 'login',
  Logout = 'logout',
}

export interface AuthCredentials {
  photosToken: string;
  accessToken: string;
  user: UserSettings;
}

class AuthService {
  private readonly eventEmitter: EventEmitter;
  private sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.eventEmitter = new EventEmitter();
    this.sdk = sdk;
  }

  async init() {
    const { credentials } = await this.getAuthCredentials();
    if (credentials) {
      SdkManager.init({
        token: credentials.accessToken,
        photosToken: credentials.photosToken,
        mnemonic: credentials.user.mnemonic,
      });
    }
  }

  public async apiLogin(email: string): Promise<LoginResponse> {
    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/login`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ email: email }),
    }).then(async (res) => {
      const data = await res.text();
      const json = JSON.parse(data);

      if (res.status === 200) {
        return json;
      } else {
        if (json) {
          throw Error(json.error);
        } else {
          throw Error(data);
        }
      }
    });
  }

  public async signout(): Promise<void> {
    const userData = await asyncStorageService.getUser();

    analytics.track(AnalyticsEventKey.UserSignOut, {
      userId: userData?.uuid,
      email: userData?.email,
      platform: DevicePlatform.Mobile,
    });

    await asyncStorageService.clearStorage();
  }

  public async doRecoverPassword(newPassword: string): Promise<Response> {
    const xUser = await asyncStorageService.getUser();
    const mnemonic = xUser.mnemonic;
    const hashPass = passToHash({ password: newPassword });
    const encryptedPassword = encryptText(hashPass.hash);
    const encryptedSalt = encryptText(hashPass.salt);
    const encryptedMnemonic = encryptTextWithKey(mnemonic, newPassword);
    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/user/recover`, {
      method: 'patch',
      headers: await getHeaders(),
      body: JSON.stringify({
        password: encryptedPassword,
        salt: encryptedSalt,
        mnemonic: encryptedMnemonic,
        privateKey: null,
      }),
    });
  }

  public async doChangePassword(params: { password: string; newPassword: string }): Promise<void> {
    const { credentials } = await this.getAuthCredentials();
    if (!credentials) throw new Error('User credentials not found');
    const salt = await this.getSalt(credentials.user.email);

    if (!salt) {
      throw new Error('Internal server error. Please try later.');
    }
    const hashedCurrentPassword = passToHash({ password: params.password, salt }).hash;
    const encCurrentPass = encryptText(hashedCurrentPassword);

    const hashedNewPassword = passToHash({ password: params.newPassword });
    const encNewPass = encryptText(hashedNewPassword.hash);
    const encryptedNewSalt = encryptText(hashedNewPassword.salt);

    const encryptedMnemonic = encryptTextWithKey(credentials.user.mnemonic, params.newPassword);
    let privateKeyFinalValue;
    if (credentials.user.privateKey) {
      const privateKey = Buffer.from(credentials.user.privateKey, 'base64').toString();
      const privateKeyEncrypted = AesUtils.encrypt(privateKey, params.newPassword);
      privateKeyFinalValue = Buffer.from(privateKeyEncrypted, 'base64').toString('hex');
    } else {
      /**
       * We are not generating the public/private key in mobile
       * so could be possible that the user doesn't has one associated
       * in that case, we send this value
       */
      privateKeyFinalValue = 'MISSING_PRIVATE_KEY';
    }

    await this.sdk.users.changePassword({
      currentEncryptedPassword: encCurrentPass,
      newEncryptedSalt: encryptedNewSalt,
      encryptedMnemonic,
      newEncryptedPassword: encNewPass,
      encryptedPrivateKey: privateKeyFinalValue,
    });
  }

  public reset(email: string): Promise<void> {
    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/reset/${email}`, {}).then(async (res) => {
      if (res.status !== 200) {
        throw Error();
      }
    });
  }

  public async deleteAccount(email: string): Promise<void> {
    await this.sdk.auth.sendDeactivationEmail(email);
  }

  public async getNewBits(): Promise<string> {
    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/bits`)
      .then((res) => res.json())
      .then((res) => res.bits)
      .then((bits) => decryptText(bits));
  }

  public async areCredentialsCorrect({ email, password }: { email: string; password: string }) {
    const plainSalt = await this.getSalt(email);

    const { hash: hashedPassword } = passToHash({ password, salt: plainSalt });

    return this.sdk.auth.areCredentialsCorrect(email, hashedPassword) || false;
  }

  public async doRegister(params: RegisterParams): Promise<any> {
    const hashObj = passToHash({ password: params.password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);
    const mnemonic = await this.getNewBits();
    const encMnemonic = encryptTextWithKey(mnemonic, params.password);
    const url = `${constants.REACT_NATIVE_DRIVE_API_URL}/api/register`;

    return fetch(url, {
      method: 'post',
      headers: await getHeaders(),
      body: JSON.stringify({
        name: params.firstName,
        lastname: params.lastName,
        email: params.email.toLowerCase(),
        password: encPass,
        mnemonic: encMnemonic,
        salt: encSalt,
        referral: null,
        captcha: params.captcha,
      }),
    }).then(async (res) => {
      if (res.status === 200) {
        return res.json();
      } else {
        const body = await res.text();
        const json = JSON.parse(body);

        if (json) {
          throw Error(json.message);
        } else {
          throw Error(body);
        }
      }
    });
  }

  public generateNew2FA(): Promise<TwoFactorAuthQR> {
    return this.sdk.auth.generateTwoFactorAuthQR();
  }

  public async enable2FA(backupKey: string, code: string) {
    return this.sdk.auth.storeTwoFactorAuthKey(backupKey, code);
  }

  public async is2FAEnabled(email: string): Promise<SecurityDetails> {
    return this.sdk.auth.securityDetails(email);
  }

  public async disable2FA(encryptedSalt: string, password: string, code: string) {
    const salt = decryptText(encryptedSalt);
    const { hash } = passToHash({ password: password, salt });
    const encryptedPassword = encryptText(hash);

    return this.sdk.auth.disableTwoFactorAuth(encryptedPassword, code);
  }

  public addLoginListener(listener: () => void) {
    this.eventEmitter.on(AuthEventKey.Login, listener);
  }

  public removeLoginListener(listener: () => void) {
    this.eventEmitter.removeListener(AuthEventKey.Login, listener);
  }

  public addLogoutListener(listener: () => void) {
    this.eventEmitter.on(AuthEventKey.Logout, listener);
  }

  public removeLogoutListener(listener: () => void) {
    this.eventEmitter.removeListener(AuthEventKey.Logout, listener);
  }

  public emitLoginEvent() {
    this.eventEmitter.emit(AuthEventKey.Login);
  }

  public emitLogoutEvent() {
    this.eventEmitter.emit(AuthEventKey.Logout);
  }

  /**
   * Obtains the logged in user and associated tokens
   *
   * @returns {Promise<AuthCredentials>} The user, photosToken and token for the session user
   */
  public async getAuthCredentials(): Promise<{ credentials?: AuthCredentials }> {
    const token = await asyncStorageService.getItem(AsyncStorageKey.Token);
    const photosToken = await asyncStorageService.getItem(AsyncStorageKey.PhotosToken);
    const user = await asyncStorageService.getUser();

    return {
      credentials: token && photosToken && user ? { accessToken: token, photosToken, user } : undefined,
    };
  }

  /**
   * Gets the salt from a given email
   *
   * @param email The email to obtain the salt from
   * @returns The salt obtained and decrypted
   */
  private async getSalt(email: string) {
    const securityDetails = await this.sdk.auth.securityDetails(email);

    if (!securityDetails) throw new Error('Security details not found');

    const plainSalt = decryptText(securityDetails.encryptedSalt);

    return plainSalt;
  }
}

export default new AuthService(SdkManager.getInstance());
