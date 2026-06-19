import { Platform } from 'react-native';

jest.mock('react-native-create-thumbnail', () => ({ createThumbnail: jest.fn() }));
jest.mock('react-native-pdf-thumbnail', () => ({ __esModule: true, default: { generate: jest.fn() } }));
jest.mock('@dr.pogodin/react-native-fs', () => ({ stat: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn().mockReturnValue({
      resize: jest.fn(),
      renderAsync: jest.fn().mockResolvedValue({
        saveAsync: jest.fn().mockResolvedValue({ uri: 'file:///tmp/thumb.jpg', width: 512, height: 512 }),
        release: jest.fn(),
      }),
      release: jest.fn(),
    }),
  },
  SaveFormat: { JPEG: 'jpeg' },
}));

import {
  generateImageThumbnail,
  generatePdfThumbnail,
  generateThumbnail,
  generateVideoThumbnail,
} from './thumbnail.generation';

const mocks = () => ({
  createThumbnail: jest.requireMock('react-native-create-thumbnail').createThumbnail as jest.Mock,
  pdfGenerate: jest.requireMock('react-native-pdf-thumbnail').default.generate as jest.Mock,
  manipulate: jest.requireMock('expo-image-manipulator').ImageManipulator.manipulate as jest.Mock,
  stat: jest.requireMock('@dr.pogodin/react-native-fs').stat as jest.Mock,
});

beforeEach(() => {
  jest.clearAllMocks();
  mocks().stat.mockResolvedValue({ size: 1024 });
  mocks().createThumbnail.mockResolvedValue({ path: '/tmp/thumb.jpg', width: 512, height: 512 });
  mocks().pdfGenerate.mockResolvedValue({ uri: 'file:///tmp/thumb.jpg', width: 512, height: 512 });
});

describe('generateVideoThumbnail', () => {
  test('when path is a raw absolute path, then createThumbnail receives a valid file:/// URI', async () => {
    await generateVideoThumbnail('/var/mobile/Containers/Data/holiday_clip.mp4');

    expect(mocks().createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'file:///var/mobile/Containers/Data/holiday_clip.mp4' }),
    );
  });

  test('when path is missing the leading slash, then createThumbnail still receives a valid file:/// URI', async () => {
    await generateVideoThumbnail('var/mobile/Containers/Data/holiday_clip.mp4');

    expect(mocks().createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'file:///var/mobile/Containers/Data/holiday_clip.mp4' }),
    );
  });

  test('when path already has file:// scheme, then createThumbnail receives it unchanged', async () => {
    await generateVideoThumbnail('file:///var/mobile/Containers/Data/holiday_clip.mp4');

    expect(mocks().createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'file:///var/mobile/Containers/Data/holiday_clip.mp4' }),
    );
  });

  test('when path has spaces in the filename, then createThumbnail receives a percent-encoded URI', async () => {
    await generateVideoThumbnail('/var/mobile/Containers/Data/summer trip 2024.mp4');

    expect(mocks().createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'file:///var/mobile/Containers/Data/summer%20trip%202024.mp4' }),
    );
  });
});

describe('generatePdfThumbnail', () => {
  test('when path is a raw absolute path, then PdfThumbnail receives a valid file:/// URI', async () => {
    await generatePdfThumbnail('/var/mobile/Containers/Data/report.pdf');

    expect(mocks().pdfGenerate).toHaveBeenCalledWith(
      'file:///var/mobile/Containers/Data/report.pdf',
      expect.anything(),
      expect.anything(),
    );
  });

  test('when path has spaces and accented characters, then PdfThumbnail receives a fully percent-encoded URI', async () => {
    await generatePdfThumbnail('/var/mobile/Containers/Data/Présentation Réunion.pdf');

    expect(mocks().pdfGenerate).toHaveBeenCalledWith(
      'file:///var/mobile/Containers/Data/Pr%C3%A9sentation%20R%C3%A9union.pdf',
      expect.anything(),
      expect.anything(),
    );
  });

  test('when path has spaces pre-encoded as %20 by the document picker, then PdfThumbnail receives the same percent-encoded URI', async () => {
    await generatePdfThumbnail('/var/mobile/Containers/Data/Pr%C3%A9sentation%20R%C3%A9union.pdf');

    expect(mocks().pdfGenerate).toHaveBeenCalledWith(
      'file:///var/mobile/Containers/Data/Pr%C3%A9sentation%20R%C3%A9union.pdf',
      expect.anything(),
      expect.anything(),
    );
  });
});

describe('generateImageThumbnail', () => {
  test('when running on iOS, then createThumbnail is used', async () => {
    Platform.OS = 'ios';

    await generateImageThumbnail('/var/mobile/Containers/Data/DCIM/IMG_0042.jpg');

    expect(mocks().createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'file:///var/mobile/Containers/Data/DCIM/IMG_0042.jpg' }),
    );
    expect(mocks().manipulate).not.toHaveBeenCalled();
  });

  test('when running on Android, then expo-image-manipulator is used', async () => {
    Platform.OS = 'android';

    await generateImageThumbnail('/storage/emulated/0/DCIM/Camera/IMG_0042.jpg');

    expect(mocks().manipulate).toHaveBeenCalledWith('file:///storage/emulated/0/DCIM/Camera/IMG_0042.jpg');
    expect(mocks().createThumbnail).not.toHaveBeenCalled();
  });
});

describe('generateThumbnail', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
  });

  test('when extension is a supported image type, then it routes through createThumbnail', async () => {
    await generateThumbnail('/var/mobile/Containers/Data/DCIM/IMG_0042.png', 'png');

    expect(mocks().createThumbnail).toHaveBeenCalledTimes(1);
    expect(mocks().pdfGenerate).not.toHaveBeenCalled();
  });

  test('when extension is a supported video type, then it routes through createThumbnail', async () => {
    await generateThumbnail('/var/mobile/Containers/Data/DCIM/VID_0042.mp4', 'mp4');

    expect(mocks().createThumbnail).toHaveBeenCalledTimes(1);
    expect(mocks().pdfGenerate).not.toHaveBeenCalled();
  });

  test('when extension is pdf, then it routes through PdfThumbnail', async () => {
    await generateThumbnail('/var/mobile/Containers/Data/report.pdf', 'pdf');

    expect(mocks().pdfGenerate).toHaveBeenCalledTimes(1);
    expect(mocks().createThumbnail).not.toHaveBeenCalled();
  });

  test('when extension is uppercase, then it still routes to the correct generator', async () => {
    await generateThumbnail('/var/mobile/Containers/Data/DCIM/IMG_0042.PNG', 'PNG');

    expect(mocks().createThumbnail).toHaveBeenCalledTimes(1);
    expect(mocks().pdfGenerate).not.toHaveBeenCalled();
  });
});
