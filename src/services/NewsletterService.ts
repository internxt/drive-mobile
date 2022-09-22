import Axios from 'axios';
import { getHeaders } from '../helpers/headers';
import appService from './AppService';
import errorService from './ErrorService';

class NewsletterService {
  public readonly groupId = '103406410';

  public async subscribe(email: string): Promise<void> {
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    try {
      await Axios.post(
        appService.constants.DRIVE_API_URL + '/newsletter/subscribe',
        {
          email,
          groupId: this.groupId,
        },
        {
          headers: headersMap,
        },
      );
    } catch (err) {
      const castedError = errorService.castError(err);

      throw castedError;
    }
  }
}

const newsletterService = new NewsletterService();
export default newsletterService;
