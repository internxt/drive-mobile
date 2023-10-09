import AesUtils from '../../../helpers/aesUtils';

export class KeysService {
  decryptPrivateKey(privateKey: string, password: string): string {
    return AesUtils.decrypt(privateKey, password);
  }
}

export const keysService = new KeysService();
