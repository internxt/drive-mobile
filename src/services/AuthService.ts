import { Auth, SecurityDetails, TwoFactorAuthQR } from '@internxt/sdk';
import packageJson from '../../package.json';
import { decryptText, encryptText, encryptTextWithKey, passToHash } from '../helpers';
import analytics, { AnalyticsEventKey } from './AnalyticsService';
import { getHeaders } from '../helpers/headers';
import { DevicePlatform, NotificationType } from '../types';
import asyncStorageService from './AsyncStorageService';
import { constants } from './AppService';
import AesUtils from '../helpers/aesUtils';
import errorService from './ErrorService';
import notificationsService from './NotificationsService';
import EventEmitter from 'events';

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

class AuthService {
  private readonly eventEmitter: EventEmitter;
  private sdk?: Auth;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  public initialize(accessToken: string, mnemonic: string) {
    this.sdk = Auth.client(
      `${constants.REACT_NATIVE_DRIVE_API_URL}/api`,
      {
        clientName: packageJson.name,
        clientVersion: packageJson.version,
      },
      { token: accessToken, mnemonic },
    );
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

  public async doChangePassword(params: { password: string; newPassword: string }): Promise<any> {
    const xUser = await asyncStorageService.getUser();
    const salt = await this.getSalt(xUser.email);

    if (!salt) {
      throw new Error('Internal server error. Please try later.');
    }
    const hashedCurrentPassword = passToHash({ password: params.password, salt }).hash;
    const encCurrentPass = encryptText(hashedCurrentPassword);

    const hashedNewPassword = passToHash({ password: params.newPassword });
    const encNewPass = encryptText(hashedNewPassword.hash);
    const encryptedNewSalt = encryptText(hashedNewPassword.salt);

    const encryptedMnemonic = encryptTextWithKey(xUser.mnemonic, params.newPassword);

    let privateKeyEncrypted;

    try {
      const privateKey = Buffer.from(xUser.privateKey, 'base64').toString();

      privateKeyEncrypted = AesUtils.encrypt(privateKey, params.newPassword);
    } catch (err) {
      const castedError = errorService.castError(err);
      notificationsService.show({
        text1: 'Error encrypting private key: ' + castedError.message,
        type: NotificationType.Error,
      });
    }

    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/user/password`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify({
        currentPassword: encCurrentPass,
        newPassword: encNewPass,
        newSalt: encryptedNewSalt,
        mnemonic: encryptedMnemonic,
        privateKey: privateKeyEncrypted,
      }),
    }).then(async (res) => {
      if (res.status === 200) {
        return res.json();
      } else {
        const body = await res.text();
        const json = JSON.parse(body);

        if (json) {
          throw Error(json.error);
        } else {
          throw Error(body);
        }
      }
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
    this.checkIsInitialized();

    await this.sdk?.sendDeactivationEmail(email);
  }

  public async getNewBits(): Promise<string> {
    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/bits`)
      .then((res) => res.json())
      .then((res) => res.bits)
      .then((bits) => decryptText(bits));
  }

  public async areCredentialsCorrect({ email, password }: { email: string; password: string }) {
    const salt = await this.getSalt(email);
    const { hash: hashedPassword } = passToHash({ password, salt });

    return this.sdk?.areCredentialsCorrect(email, hashedPassword) || false;
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
    this.checkIsInitialized();

    return <Promise<TwoFactorAuthQR>>this.sdk?.generateTwoFactorAuthQR();
  }

  public async enable2FA(backupKey: string, code: string) {
    this.checkIsInitialized();

    return (<Auth>this.sdk).storeTwoFactorAuthKey(backupKey, code);
  }

  public async is2FAEnabled(email: string): Promise<SecurityDetails> {
    this.checkIsInitialized();

    return (<Auth>this.sdk).securityDetails(email);
  }

  public async disable2FA(passwordSalt: string, deactivationPassword: string, deactivationCode: string) {
    this.checkIsInitialized();

    const salt = decryptText(passwordSalt);
    const hashObj = passToHash({ password: deactivationPassword, salt });
    const encPass = encryptText(hashObj.hash);

    return (<Auth>this.sdk).disableTwoFactorAuth(encPass, deactivationCode);
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

  private async getSalt(email: string) {
    const response = await fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/login`, {
      method: 'post',
      headers: await getHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    const salt = decryptText(data.sKey);

    return salt;
  }

  private checkIsInitialized() {
    if (!this.sdk) {
      throw new Error('AuthService not initialized...');
    }
  }
}

const authService = new AuthService();
export default authService;
