import { UserReferral, ReferralKey } from '@internxt/sdk/dist/drive/referrals/types';
import { SdkManager } from '@internxt-mobile/services/common';

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

  public getSurveyLink(clientId: string, uuid: string) {
    return `https://p7dv2nbzmf4.typeform.com/to/yM3EyqJE#uuid=${uuid}&clientid=${clientId}`;
  }
}

export default new UsersReferralsService(SdkManager.getInstance());
