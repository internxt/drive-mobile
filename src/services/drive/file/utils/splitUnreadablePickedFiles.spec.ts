import { splitUnreadablePickedFiles } from './splitUnreadablePickedFiles';

const makePickedFile = (overrides: { name?: string | null; size?: number | null; error?: string | null }) => ({
  uri: 'file:///tmp/document.pdf',
  name: 'document.pdf',
  size: 1024,
  error: null,
  ...overrides,
});

describe('splitUnreadablePickedFiles', () => {
  test('when the picker reports an error reading a file, then that file is set aside as unreadable', () => {
    const pickedFile = makePickedFile({ name: null, size: null, error: 'The file could not be read' });

    const { readablePickedFiles, unreadablePickedFiles } = splitUnreadablePickedFiles([pickedFile]);

    expect(readablePickedFiles).toEqual([]);
    expect(unreadablePickedFiles).toEqual([pickedFile]);
  });

  test('when the picker returns a file without a name, then that file is set aside as unreadable', () => {
    const pickedFile = makePickedFile({ name: null });

    const { readablePickedFiles, unreadablePickedFiles } = splitUnreadablePickedFiles([pickedFile]);

    expect(readablePickedFiles).toEqual([]);
    expect(unreadablePickedFiles).toEqual([pickedFile]);
  });

  test('when the picker returns a named file without a size, then the file is still uploaded', () => {
    const pickedFile = makePickedFile({ size: null });

    const { readablePickedFiles, unreadablePickedFiles } = splitUnreadablePickedFiles([pickedFile]);

    expect(readablePickedFiles).toEqual([pickedFile]);
    expect(unreadablePickedFiles).toEqual([]);
  });

  test('when only some picked files are unreadable, then the rest are kept in their original order', () => {
    const firstReadableFile = makePickedFile({ name: 'first.pdf' });
    const unreadableFile = makePickedFile({ name: null, error: 'The file could not be read' });
    const secondReadableFile = makePickedFile({ name: 'second.pdf' });

    const { readablePickedFiles, unreadablePickedFiles } = splitUnreadablePickedFiles([
      firstReadableFile,
      unreadableFile,
      secondReadableFile,
    ]);

    expect(readablePickedFiles).toEqual([firstReadableFile, secondReadableFile]);
    expect(unreadablePickedFiles).toEqual([unreadableFile]);
  });
});
