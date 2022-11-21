import { isValidFilename } from './crypt';

describe('isValidFilename', () => {
  test('Allow a normal filename', () => {
    const allow = isValidFilename('valid_filename.jpg');
    const allowWithNumbers = isValidFilename('012 345.txt');
    expect(allow).toBeTruthy();
    expect(allowWithNumbers).toBeTruthy();
  });

  test('Allow numeric filename without extension', () => {
    const allow = isValidFilename('0123456');
    expect(allow).toBeTruthy();
  });

  test('Allow a filename with spaces', () => {
    const allow = isValidFilename('valid filename with spaces.jpg');
    expect(allow).toBeTruthy();
  });

  test('Allow a filename without extension', () => {
    const allow = isValidFilename('unknown_extension');
    expect(allow).toBeTruthy();
  });

  test('Exclude filenames containing invalid characters', () => {
    const withSlash = isValidFilename('invalid/filename.jpg');
    const withColon = isValidFilename('invalid:filename.jpg');
    const evilFile = isValidFilename('../../imevil.sh');
    expect(withSlash).toBeFalsy();
    expect(withColon).toBeFalsy();
    expect(evilFile).toBeFalsy();
  });

  test('Exclude root filenames', () => {
    const rootFile = isValidFilename('..');
    expect(rootFile).toBeFalsy();
  });
});
