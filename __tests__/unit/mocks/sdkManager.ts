import { SdkManager } from '@internxt-mobile/services/common/sdk/SdkManager';

export const SdkManagerMock: SdkManager = {
  getApiSecurity: jest.fn(),
  authV2: jest.fn()(),
  usersV2: jest.fn()(),
  usersV2WithoutToken: jest.fn()(),
  payments: jest.fn()(),
  storageV2: jest.fn()(),
  share: jest.fn()(),
  trash: jest.fn()(),
};
