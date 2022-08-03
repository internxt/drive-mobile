import { SdkManager } from 'src/services/common/SdkManager';

export const SdkManagerMock: SdkManager = {
  getApiSecurity: jest.fn(),
  auth: jest.fn()(),
  referrals: jest.fn()(),
  users: jest.fn()(),
  payments: jest.fn()(),
  storage: jest.fn()(),
  photos: jest.fn()(),
};
