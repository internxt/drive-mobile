import { hasPhotosFeatureAccess } from './selectors';
import { paymentsSelectors } from 'src/store/slices/payments';

jest.mock('src/store/slices/payments', () => ({
  paymentsSelectors: {
    hasPhotosAccess: jest.fn(),
  },
}));

describe('hasPhotosFeatureAccess', () => {
  test('when photos access is granted by the plan, then returns true', () => {
    (paymentsSelectors.hasPhotosAccess as jest.Mock).mockReturnValue(true);
    expect(hasPhotosFeatureAccess({} as any)).toBe(true);
  });

  test('when photos access is not granted by the plan, then returns false', () => {
    (paymentsSelectors.hasPhotosAccess as jest.Mock).mockReturnValue(false);
    expect(hasPhotosFeatureAccess({} as any)).toBe(false);
  });
});
