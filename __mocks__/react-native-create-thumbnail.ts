import { Thumbnail } from 'react-native-create-thumbnail';

jest.mock('react-native-create-thumbnail', () => {
  return {
    path: '/data/tmp/thumbail_01.jpg',
    size: 100,
    mime: 'jpg',
    width: 512,
    height: 512,
  } as Thumbnail;
});
