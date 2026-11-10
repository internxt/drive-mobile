import { driveFileService } from './driveFile.service';

describe('Choosing where a decrypted file is kept', () => {
  test('when two files have the same name, then each one is kept in a different place', () => {
    const firstFilePath = driveFileService.getDecryptedFilePath('first-file-uuid', 'report', 'pdf');
    const secondFilePath = driveFileService.getDecryptedFilePath('second-file-uuid', 'report', 'pdf');

    expect(firstFilePath).not.toBe(secondFilePath);
  });

  test('when a file is kept on the device, then it keeps its own name and extension', () => {
    const filePath = driveFileService.getDecryptedFilePath('file-uuid', 'report', 'pdf');

    expect(filePath).toContain('file-uuid/report.pdf');
  });
});
