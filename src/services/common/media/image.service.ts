import Share from 'react-native-share';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import strings from '../../../../assets/lang/strings';
import RNFetchBlob from 'rn-fetch-blob';
import notificationsService from '../../NotificationsService';
import { NotificationType } from '../../../types';
import { createThumbnail } from 'react-native-create-thumbnail';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import PdfThumbnail from 'react-native-pdf-thumbnail';
import uuid from 'react-native-uuid';
import { FileExtension } from '@internxt-mobile/types/drive';
export type GeneratedThumbnail = {
  size: number;
  type: string;
  width: number;
  height: number;
  path: string;
};

const MAX_THUMBNAIL_WIDTH = 512;
export type ThumbnailGenerateConfig = {
  outputPath: string;
  quality?: number;
  width?: number;
  height?: number;
};
class ImageService {
  private get thumbnailGenerators(): Record<
    FileExtension,
    (filePath: string, config: ThumbnailGenerateConfig) => Promise<GeneratedThumbnail>
  > {
    return {
      [FileExtension.AVI]: this.generateVideoThumbnail,
      [FileExtension.MP4]: this.generateVideoThumbnail,
      [FileExtension.MOV]: this.generateVideoThumbnail,
      [FileExtension.JPEG]: this.generateImageThumbnail,
      [FileExtension.JPG]: this.generateImageThumbnail,
      [FileExtension.PNG]: this.generateImageThumbnail,
      [FileExtension.HEIC]: this.generateImageThumbnail,
      [FileExtension.PDF]: this.generatePdfThumbnail,
    };
  }
  public readonly BASE64_PREFIX = 'data:image/png;base64,';

  public async resize({
    uri,
    width,
    height,
    quality,
    outputPath,
  }: {
    uri: string;
    width: number;
    height?: number;
    format: string;
    quality: number;
    rotation?: number;
    outputPath?: string;
  }) {
    const getRequiredUriFormat = () => {
      if (uri.startsWith('file:')) {
        return uri;
      } else {
        return `file://${uri.startsWith('/') ? uri : `/${uri}`}`;
      }
    };

    const result = await manipulateAsync(
      getRequiredUriFormat(),
      [
        {
          resize: {
            width,
            height,
          },
        },
      ],
      {
        format: SaveFormat.JPEG,
        compress: quality / 100,
      },
    );

    const stat = await fileSystemService.statRNFS(result.uri);
    if (outputPath && !(await fileSystemService.exists(outputPath))) {
      await fileSystemService.copyFile(result.uri, outputPath);
    }
    return {
      size: stat.size,
      width: result.width,
      height: result.height,
      path: outputPath || result.uri,
    };
  }

  public async share(uri: string) {
    try {
      const result = await Share.open({
        title: strings.modals.SharePhoto.nativeMesage,
        url: uri,
      });

      if (result.success) {
        notificationsService.show({
          type: NotificationType.Success,
          text1: strings.messages.photoShared,
        });
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

  /**
   * Generates a thumbnail for a file, if the extension cannot be handled, returns null
   */
  public async generateThumbnail(
    filePath: string,
    config: { outputPath: string; quality?: number; extension: string; thumbnailFormat: SaveFormat },
  ): Promise<GeneratedThumbnail | null> {
    const generator = this.thumbnailGenerators[config.extension.toLowerCase() as FileExtension];

    if (!generator) {
      // eslint-disable-next-line no-console
      console.error(`Cannot generate thumbnail for extension ${config.extension}`);

      return null;
    }
    return this.resizeThumbnail(await generator(filePath, config));
  }
  /**
   * Generates a thumbnail for a video file
   */
  public generateVideoThumbnail = async (filePath: string): Promise<GeneratedThumbnail> => {
    const result = await createThumbnail({
      url: fileSystemService.pathToUri(filePath),
      dirSize: 100,
    });

    return {
      size: result.size,
      type: 'JPEG',
      width: result.width,
      height: result.height,
      path: result.path,
    };
  };

  /**
   * Generates a thumbnail for an image
   */
  public generateImageThumbnail = async (
    filePath: string,
    config: ThumbnailGenerateConfig,
  ): Promise<GeneratedThumbnail> => {
    const result = await this.resize({
      uri: filePath,
      outputPath: config.outputPath,
      width: config.width || MAX_THUMBNAIL_WIDTH,
      height: config.height,
      format: 'JPEG',
      quality: 80,
    });

    return {
      size: result.size,
      type: 'JPEG',
      width: result.width,
      height: result.height,
      path: result.path,
    };
  };

  /** Generates a thumbnail from a PDF file */
  public generatePdfThumbnail = async (
    filePath: string,
    config: ThumbnailGenerateConfig,
  ): Promise<GeneratedThumbnail> => {
    const neededPath = filePath.startsWith('file:///') ? filePath : `file:///${filePath}`;
    const result = await PdfThumbnail.generate(neededPath, 0, config.quality || 80);
    // The library has some problems if the URI contains spaces
    const outputPath = decodeURI(result.uri);
    if (!(await fileSystemService.exists(config.outputPath))) {
      await fileSystemService.moveFile(outputPath, config.outputPath);
    }

    const stat = await fileSystemService.statRNFS(config.outputPath);
    return {
      path: config.outputPath,
      width: result.width,
      height: result.height,
      size: stat.size,
      type: 'JPEG',
    };
  };

  private async resizeThumbnail(originThumbnail: GeneratedThumbnail): Promise<GeneratedThumbnail> {
    const destination = fileSystemService.tmpFilePath(uuid.v4().toString());

    const result = await this.resize({
      uri: originThumbnail.path,
      width: MAX_THUMBNAIL_WIDTH,
      quality: 80,
      format: 'JPEG',
      outputPath: destination,
    });

    return {
      width: result.width,
      height: result.height,
      path: result.path,
      size: result.size,
      type: 'JPEG',
    };
  }
}

export const imageService = new ImageService();
