import Axios from 'axios';
import appService from './app';
import errorService from './error';

class NewsletterService {
  public readonly groupId = '103406410';

  public async subscribe(email: string): Promise<void> {
    try {
      await Axios.post(appService.constants.REACT_NATIVE_DRIVE_API_URL + '/api/newsletter/subscribe', {
        email,
        groupId: this.groupId,
      });
    } catch (err) {
      const castedError = errorService.castError(err);

      throw castedError;
    }
  }
}

const newsletterService = new NewsletterService();
export default newsletterService;
