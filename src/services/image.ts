import Share from 'react-native-share';
import ImageResizer, { ResizeFormat, ResizeMode } from 'react-native-image-resizer';

import strings from '../../assets/lang/strings';
import { notify } from './toast';

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
        notify({ type: 'success', text: strings.messages.photoShared });
      } else if (result.dismissedAction) {
        // dismissed
      }
    } catch (err) {
      // notify({ type: 'error', text: strings.errors.photoShared });
    }
  }
}

const imageService = new ImageService();
export default imageService;
