import Share from 'react-native-share';
import ImageResizer, { ResizeFormat, ResizeMode } from 'react-native-image-resizer';

import strings from '../../assets/lang/strings';
import RNFetchBlob from 'rn-fetch-blob';
import notificationsService from './NotificationsService';
import { NotificationType } from '../types';

class ImageService {
  public readonly BASE64_PREFIX = 'data:image/png;base64,';

  public async resize({
    uri,
    width,
    height,
    format,
    quality,
    rotation,
    outputPath,
    keepMeta,
    options,
  }: {
    uri: string;
    width: number;
    height: number;
    format: ResizeFormat;
    quality: number;
    rotation?: number;
    outputPath?: string;
    keepMeta?: boolean;
    options?: {
      mode?: ResizeMode;
      onlyScaleDown?: boolean;
    };
  }) {
    const response = await ImageResizer.createResizedImage(
      uri,
      width,
      height,
      format,
      quality,
      rotation,
      outputPath,
      keepMeta,
      options,
    );

    return response;
  }

  public async share(uri: string) {
    try {
      const result = await Share.open({ title: strings.modals.share_photo_modal.nativeMesage, url: uri });

      if (result.success) {
        notificationsService.show({ type: NotificationType.Success, text1: strings.messages.photoShared });
      } else if (result.dismissedAction) {
        // dismissed
      }
    } catch (err) {
      // notificationsService.show({ type: ToastType.Error, text1: strings.errors.photoShared });
    }
  }

  public async pathToBase64(uri: string): Promise<string> {
    return await RNFetchBlob.fs.readFile(uri, 'base64');
  }
}

const imageService = new ImageService();
export default imageService;
