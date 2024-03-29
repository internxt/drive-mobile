import { SdkManager } from '@internxt-mobile/services/common/sdk/SdkManager';

export const SdkManagerMock: SdkManager = {
  getApiSecurity: jest.fn(),
  auth: jest.fn()(),
  authV2: jest.fn()(),
  referrals: jest.fn()(),
  users: jest.fn()(),
  payments: jest.fn()(),
  storage: jest.fn()(),
  photos: jest.fn()(),
  share: jest.fn()(),
  trash: jest.fn()(),
};
