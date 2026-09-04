import { RootState } from 'src/store';
import { paymentsSelectors } from 'src/store/slices/payments';

export const hasPhotosFeatureAccess = (state: RootState): boolean => paymentsSelectors.hasPhotosAccess(state);
