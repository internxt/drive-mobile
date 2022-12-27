import { Keys, Password, RegisterDetails, TwoFactorAuthQR } from '@internxt/sdk';
import { decryptText, decryptTextWithKey, encryptText, encryptTextWithKey, passToHash } from '../helpers';
import analytics, { AnalyticsEventKey } from './AnalyticsService';
import { getHeaders } from '../helpers/headers';
import { AsyncStorageKey } from '../types';
import asyncStorageService from './AsyncStorageService';
import appService, { constants } from './AppService';
import AesUtils from '../helpers/aesUtils';
import EventEmitter from 'events';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkManager } from './common/sdk/SdkManager';
import jwtDecode from 'jwt-decode';
import errorService from './ErrorService';
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

export type JWTPayload = {
  email: string;
  iat: number;
  exp: number;
};

class AuthService {
  defaultName = 'My';
  defaultLastname = 'Internxt';
  private readonly eventEmitter: EventEmitter;
  private sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.eventEmitter = new EventEmitter();
    this.sdk = sdk;
  }

  async init() {
    try {
      const { credentials } = await this.getAuthCredentials();

      SdkManager.init({
        token: credentials.accessToken,
        photosToken: credentials.photosToken,
        mnemonic: credentials.user.mnemonic,
      });
    } catch {
      // Pass
    }
  }

  public async doLogin(email: string, password: string, tfaCode?: string) {
    const loginResult = await this.sdk.auth.login(
      {
        email,
        password,
        tfaCode,
      },
      {
        encryptPasswordHash(password: Password, encryptedSalt: string): string {
          const salt = decryptText(encryptedSalt);
          const hashObj = passToHash({ password, salt });
          return encryptText(hashObj.hash);
        },
        async generateKeys(): Promise<Keys> {
          const keys: Keys = {
            privateKeyEncrypted: '',
            publicKey: '',
            revocationCertificate: '',
          };
          return keys;
        },
      },
    );

    loginResult.user.mnemonic = decryptTextWithKey(loginResult.user.mnemonic, password);

    // Get the refreshed tokens, they contain expiration, the ones returned
    // on the login doesn't have expiration
    const refreshedTokens = await this.refreshAuthToken(loginResult.newToken);

    if (!refreshedTokens?.token || !refreshedTokens?.newToken) throw new Error('Unable to refresh auth tokens');
    return {
      ...loginResult,
      token: refreshedTokens.token,
      newToken: refreshedTokens.newToken,
    };
  }

  public async signout(): Promise<void> {
    analytics.track(AnalyticsEventKey.UserLogout);
    await asyncStorageService.clearStorage();
  }

  public async doRecoverPassword(newPassword: string): Promise<Response> {
    const xUser = await asyncStorageService.getUser();
    const mnemonic = xUser.mnemonic;
    const hashPass = passToHash({ password: newPassword });
    const encryptedPassword = encryptText(hashPass.hash);
    const encryptedSalt = encryptText(hashPass.salt);
    const encryptedMnemonic = encryptTextWithKey(mnemonic, newPassword);
    return fetch(`${constants.DRIVE_API_URL}/user/recover`, {
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
    return fetch(`${constants.DRIVE_API_URL}/reset/${email}`, {}).then(async (res) => {
      if (res.status !== 200) {
        throw Error();
      }
    });
  }

  public async deleteAccount(email: string): Promise<void> {
    await this.sdk.auth.sendDeactivationEmail(email);
  }

  public async getNewBits(): Promise<string> {
    return fetch(`${constants.DRIVE_API_URL}/bits`)
      .then((res) => res.json())
      .then((res) => res.bits)
      .then((bits) => decryptText(bits));
  }

  public async areCredentialsCorrect({ email, password }: { email: string; password: string }) {
    const plainSalt = await this.getSalt(email);

    const { hash: hashedPassword } = passToHash({ password, salt: plainSalt });

    return this.sdk.auth.areCredentialsCorrect(email, hashedPassword) || false;
  }

  public async doRegister(params: RegisterParams) {
    const hashObj = passToHash({ password: params.password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);
    const mnemonic = await this.getNewBits();
    const encMnemonic = encryptTextWithKey(mnemonic, params.password);

    const payload: RegisterDetails = {
      email: params.email.toLowerCase(),
      name: params.firstName,
      lastname: params.lastName,
      password: encPass,
      mnemonic: encMnemonic,
      salt: encSalt,
      keys: {
        privateKeyEncrypted: '',
        publicKey: '',
        revocationCertificate: '',
      },
      captcha: params.captcha,
    };

    return this.sdk.authV2.register(payload);
  }

  public generateNew2FA(): Promise<TwoFactorAuthQR> {
    return this.sdk.auth.generateTwoFactorAuthQR();
  }

  public async enable2FA(backupKey: string, code: string) {
    return this.sdk.auth.storeTwoFactorAuthKey(backupKey, code);
  }

  public getSecurityDetails(email: string) {
    return this.sdk.auth.securityDetails(email);
  }
  public async is2FAEnabled(email: string): Promise<boolean> {
    const securityDetails = await this.getSecurityDetails(email);

    return securityDetails.tfaEnabled;
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

  public isEmailAlreadyInUseError(error: Error) {
    return error.message.includes('is already registered');
  }

  /**
   * Obtains the logged in user and associated tokens
   *
   * @returns {Promise<AuthCredentials>} The user, photosToken and token for the session user
   */
  public async getAuthCredentials(): Promise<{ credentials: AuthCredentials }> {
    const token = await asyncStorageService.getItem(AsyncStorageKey.Token);
    const photosToken = await asyncStorageService.getItem(AsyncStorageKey.PhotosToken);
    const user = await asyncStorageService.getUser();

    if (!user || !token || !photosToken) {
      throw new Error('Some credentials are missing, unable to retrieve auth credentials');
    }
    return {
      credentials: { accessToken: token, photosToken, user },
    };
  }

  /**
   *
   * Verifies if a JWT token is expired or not
   *
   * @param authToken The token to be checked
   * @returns {boolean} If the token has expired or not
   */
  public authTokenHasExpired(authToken: string): boolean {
    try {
      const payload = jwtDecode<JWTPayload>(authToken);

      // No expiration, bye
      if (!payload.exp) return true;
      const expiration = payload.exp * 1000;

      return expiration > Date.now() ? false : true;
    } catch {
      return true;
    }
  }

  /**
   * Exchange a current token for a new one with
   * extended expiration
   *
   * If the token is expired, an error will be thrown
   *
   * @param currentAuthToken The current auth token, needs to be still valid
   * @returns A valid set of token and newToken
   */
  public async refreshAuthToken(currentAuthToken: string): Promise<{ newToken: string; token: string } | undefined> {
    try {
      const result = await fetch(`${appService.constants.DRIVE_NEW_API_URL}/users/refresh`, {
        method: 'GET',
        headers: await getHeaders(currentAuthToken),
      });

      const body = await result.json();
      const { newToken, token, statusCode } = body;

      if (statusCode === 401) {
        throw new Error('Tokens no longer valid, should sign out');
      }

      return {
        newToken,
        token,
      };
    } catch (e) {
      errorService.reportError(e);

      return undefined;
    }
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
