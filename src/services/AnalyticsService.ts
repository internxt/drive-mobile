import { BaseLogger } from './common';

export type JsonMap = Record<string, unknown>;
export type Options = Record<string, string | number>;

export enum AnalyticsEventKey {
  UserSignUp = 'User Signup',
  UserSignIn = 'User Signin',
  UserSignUpFailed = 'User Signup Failed',
  UserSignInFailed = 'User Signin Failed',
  UserLogout = 'User Logout',
  PaymentConversion = 'Payment Conversion',
  TrashEmptied = 'Trash Emptied',
  Usage = 'Usage',
}

export enum DriveAnalyticsEvent {
  FileUploadStarted = 'File Upload Started',
  FileUploadCompleted = 'File Upload Completed',
  FileUploadError = 'File Upload Error',
  SharedLinkCopied = 'Shared Link Copied',
  SharedLinkDeleted = 'Shared Link Deleted',
  FileDeleted = 'File Deleted',
  FolderDeleted = 'Folder Deleted',
  FileDownloadStarted = 'File Download Started',
  FileDownloadError = 'File Download Error',
  FileDownloadCompleted = 'File Download Completed',
}

export class AnalyticsService {
  private logger = new BaseLogger({
    tag: 'DRIVE_ANALYTICS',
    disabled: !__DEV__,
  });

  public identify(_user: string, _traits: Record<string, string | number> = {}) {
    this.logger.info('User identified', _user, _traits);
  }

  public track(event: AnalyticsEventKey | DriveAnalyticsEvent, properties?: JsonMap) {
    this.logger.info(`"${event}" event tracked`, properties);
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
