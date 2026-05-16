import { DocumentPickerFile } from '../../../../types/drive/operations';
import { validateAndFilterFiles } from './validateAndFilterFiles';

const makeFile = (name: string, size: number): DocumentPickerFile => ({
  uri: `file:///tmp/${name}`,
  name,
  size,
  type: 'application/octet-stream',
});

describe('validateAndFilterFiles', () => {
  test('when maxUploadFileSize is 0, then no file is filtered regardless of size', () => {
    const documents = [makeFile('small.pdf', 10), makeFile('huge.bin', 50 * 1024 * 1024 * 1024)];

    const result = validateAndFilterFiles(documents, 0);

    expect(result.filesToUpload).toHaveLength(2);
    expect(result.filesExcluded).toHaveLength(0);
  });

  test('when files are within the limit, then all are accepted', () => {
    const documents = [makeFile('a.pdf', 1024), makeFile('b.pdf', 2048)];

    const result = validateAndFilterFiles(documents, 4096);

    expect(result.filesToUpload).toHaveLength(2);
    expect(result.filesExcluded).toHaveLength(0);
  });

  test('when a file equals the limit, then it is accepted (inclusive boundary)', () => {
    const documents = [makeFile('exact.pdf', 1000)];

    const result = validateAndFilterFiles(documents, 1000);

    expect(result.filesToUpload).toEqual(documents);
    expect(result.filesExcluded).toHaveLength(0);
  });

  test('when a file exceeds the limit, then it is excluded', () => {
    const documents = [makeFile('ok.pdf', 500), makeFile('too-big.pdf', 5000)];

    const result = validateAndFilterFiles(documents, 1000);

    expect(result.filesToUpload).toEqual([documents[0]]);
    expect(result.filesExcluded).toEqual([documents[1]]);
  });

  test('when a filename is invalid, then it throws', () => {
    const documents = [makeFile('..', 100)];

    expect(() => validateAndFilterFiles(documents, 1000)).toThrow(/Invalid file names/);
  });
});
