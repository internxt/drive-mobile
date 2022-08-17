import { UserReferral, ReferralKey } from '@internxt/sdk/dist/drive/referrals/types';
import { SdkManager } from './common/sdk/SdkManager';

class UsersReferralsService {
  private sdk: SdkManager;
  constructor(sdkManager: SdkManager) {
    this.sdk = sdkManager;
  }

  public async fetch(): Promise<UserReferral[]> {
    return this.sdk.referrals.getReferrals();
  }

  public hasClickAction(referralKey: ReferralKey): boolean {
    return [ReferralKey.SubscribeToNewsletter, ReferralKey.InviteFriends].includes(referralKey);
  }
}

export default new UsersReferralsService(SdkManager.getInstance());
