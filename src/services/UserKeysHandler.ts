export interface UserKeysObject {
  ecc?: {
    privateKey?: string;
    publicKey?: string;
  };
  kyber?: {
    privateKey?: string;
    publicKey?: string;
  };
}

export interface KeyData {
  eccPrivateKey: string | null;
  eccPublicKey: string | null;
  kyberPrivateKey: string | null;
  kyberPublicKey: string | null;
}

export class UserKeysHandler {
  constructor(
    private setLargeValue: (key: string, value: string) => Promise<void>,
    private getLargeValue: (key: string) => Promise<string | null>,
    private removeLargeValue: (key: string) => Promise<void>,
  ) {}

  async saveKeysField(baseKey: string, keysObject: UserKeysObject): Promise<void> {
    if (keysObject.ecc) {
      await this.saveEccKeys(baseKey, keysObject.ecc);
    }
    if (keysObject.kyber) {
      await this.saveKyberKeys(baseKey, keysObject.kyber);
    }
  }

  private async saveEccKeys(baseKey: string, ecc: NonNullable<UserKeysObject['ecc']>): Promise<void> {
    if (ecc.privateKey) {
      await this.setLargeValue(`${baseKey}_keys_ecc_privateKey`, ecc.privateKey);
    }
    if (ecc.publicKey) {
      await this.setLargeValue(`${baseKey}_keys_ecc_publicKey`, ecc.publicKey);
    }
  }

  private async saveKyberKeys(baseKey: string, kyber: NonNullable<UserKeysObject['kyber']>): Promise<void> {
    if (kyber.privateKey) {
      await this.setLargeValue(`${baseKey}_keys_kyber_privateKey`, kyber.privateKey);
    }
    if (kyber.publicKey) {
      await this.setLargeValue(`${baseKey}_keys_kyber_publicKey`, kyber.publicKey);
    }
  }

  async restoreKeysField(baseKey: string, userData: UserData): Promise<void> {
    const keyData = await this.getKeyData(baseKey);

    if (this.hasAnyKeyData(keyData)) {
      userData.keys = {};
      this.restoreEccKeys(userData, keyData);
      this.restoreKyberKeys(userData, keyData);
    }
  }

  private async getKeyData(baseKey: string): Promise<KeyData> {
    return {
      eccPrivateKey: await this.getLargeValue(`${baseKey}_keys_ecc_privateKey`),
      eccPublicKey: await this.getLargeValue(`${baseKey}_keys_ecc_publicKey`),
      kyberPrivateKey: await this.getLargeValue(`${baseKey}_keys_kyber_privateKey`),
      kyberPublicKey: await this.getLargeValue(`${baseKey}_keys_kyber_publicKey`),
    };
  }

  private hasAnyKeyData(keyData: KeyData): boolean {
    return Boolean(keyData.eccPrivateKey || keyData.eccPublicKey || keyData.kyberPrivateKey || keyData.kyberPublicKey);
  }

  private restoreEccKeys(userData: UserData, keyData: KeyData): void {
    if (keyData.eccPrivateKey || keyData.eccPublicKey) {
      if (!userData.keys) userData.keys = {};
      userData.keys.ecc = {};

      if (keyData.eccPrivateKey) userData.keys.ecc.privateKey = keyData.eccPrivateKey;
      if (keyData.eccPublicKey) userData.keys.ecc.publicKey = keyData.eccPublicKey;
    }
  }

  private restoreKyberKeys(userData: UserData, keyData: KeyData): void {
    if (keyData.kyberPrivateKey || keyData.kyberPublicKey) {
      if (!userData.keys) userData.keys = {};
      userData.keys.kyber = {};

      if (keyData.kyberPrivateKey) userData.keys.kyber.privateKey = keyData.kyberPrivateKey;
      if (keyData.kyberPublicKey) userData.keys.kyber.publicKey = keyData.kyberPublicKey;
    }
  }

  async removeKeys(baseKey: string): Promise<void> {
    await this.removeLargeValue(`${baseKey}_keys_ecc_privateKey`);
    await this.removeLargeValue(`${baseKey}_keys_ecc_publicKey`);
    await this.removeLargeValue(`${baseKey}_keys_kyber_privateKey`);
    await this.removeLargeValue(`${baseKey}_keys_kyber_publicKey`);
  }

  isKeysObject(value: unknown): value is UserKeysObject {
    return typeof value === 'object' && value !== null;
  }
}

export interface UserData {
  [key: string]: unknown;
  keys?: UserKeysObject;
}
