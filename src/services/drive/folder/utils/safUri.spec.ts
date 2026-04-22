import { getNameFromSafUri, getSafTreeName, hasSafVolumePrefix } from './safUri';

const tree = 'content://com.android.externalstorage.documents/tree/primary%3ADownload';
const childUri = (encoded: string) => `${tree}/document/${encoded}`;

describe('hasSafVolumePrefix', () => {
  test.each([
    ['primary:DCIM', 'primary'],
    ['secondary:folder', 'secondary'],
    ['home:Documents', 'home'],
    ['downloads:file.pdf', 'downloads'],
    ['raw:/absolute/path', 'raw'],
    ['1A2B-3C4D:Pictures', 'short SD-card UUID'],
    ['550e8400-e29b-41d4-a716-446655440000:folder', 'long UUID'],
  ])('when the input is "%s" (%s), then it returns true', (input) => {
    expect(hasSafVolumePrefix(input)).toBe(true);
  });

  test.each([
    ['notes: draft.txt', 'colon not at start'],
    ['my-folder', 'no colon'],
    ['IMG_20260417.jpeg', 'plain filename'],
    ['', 'empty string'],
  ])('when the input is "%s" (%s), then it returns false', (input) => {
    expect(hasSafVolumePrefix(input)).toBe(false);
  });
});

describe('getNameFromSafUri', () => {
  test('when the URI contains a simple filename, then it returns the filename', () => {
    const uri = childUri('primary%3ADownload%2Fphoto.jpg');
    expect(getNameFromSafUri(uri)).toBe('photo.jpg');
  });

  test('when the URI contains a nested path, then it returns only the last segment', () => {
    const uri = childUri('primary%3ADownload%2FSubFolder%2Fdeep.txt');
    expect(getNameFromSafUri(uri)).toBe('deep.txt');
  });

  test('when the URI points to a folder with no trailing filename, then it returns the folder name', () => {
    const uri = childUri('primary%3ADownload%2FRecordings');
    expect(getNameFromSafUri(uri)).toBe('Recordings');
  });

  test('when the name contains percent-encoded spaces, then it decodes them', () => {
    const uri = childUri('primary%3ADownload%2FMy%20Files');
    expect(getNameFromSafUri(uri)).toBe('My Files');
  });

  test('when the document segment has no slash after the volume prefix, then it strips the prefix', () => {
    const uri = childUri('primary%3ADCIM');
    expect(getNameFromSafUri(uri)).toBe('DCIM');
  });

  test('when the URI uses a short SD-card UUID prefix, then it strips the prefix', () => {
    const uri =
      'content://com.android.externalstorage.documents/tree/1A2B-3C4D%3APictures/document/1A2B-3C4D%3APictures%2Ffoo.jpg';
    expect(getNameFromSafUri(uri)).toBe('foo.jpg');
  });

  test('when the URI uses a long UUID prefix, then it strips the prefix', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const uri = `content://com.android.externalstorage.documents/tree/${encodeURIComponent(uuid + ':Music')}/document/${encodeURIComponent(uuid + ':Music/song.mp3')}`;
    expect(getNameFromSafUri(uri)).toBe('song.mp3');
  });

  test('when the name contains a colon that is not a volume prefix, then it preserves it', () => {
    const uri = childUri(encodeURIComponent('primary:Download/notes: draft.txt'));
    expect(getNameFromSafUri(uri)).toBe('notes: draft.txt');
  });
});

describe('getSafTreeName', () => {
  test('when the tree URI encodes a primary volume folder, then it returns the folder name without the prefix', () => {
    expect(getSafTreeName('content://com.android.externalstorage.documents/tree/primary%3AMusic', 'Unnamed')).toBe(
      'Music',
    );
  });

  test('when the tree URI has a trailing slash, then it strips it before extracting the name', () => {
    expect(getSafTreeName('content://com.android.externalstorage.documents/tree/primary%3ADownload/', 'Unnamed')).toBe(
      'Download',
    );
  });

  test('when the tree URI uses a short SD-card UUID prefix, then it strips the prefix', () => {
    expect(getSafTreeName('content://com.android.externalstorage.documents/tree/1A2B-3C4D%3APictures', 'Unnamed')).toBe(
      'Pictures',
    );
  });

  test('when stripping the prefix leaves an empty string, then it returns the fallback', () => {
    expect(getSafTreeName('content://com.android.externalstorage.documents/tree/primary%3A', 'Unnamed')).toBe(
      'Unnamed',
    );
  });

  test('when the URI segment has no volume prefix, then it returns the name as-is', () => {
    expect(getSafTreeName('content://com.android.externalstorage.documents/tree/MyFolder', 'Unnamed')).toBe('MyFolder');
  });
});
