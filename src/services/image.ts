import ImageResizer, { ResizeFormat, ResizeMode } from 'react-native-image-resizer';

class ImageService {
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
}

const imageService = new ImageService();
export default imageService;
