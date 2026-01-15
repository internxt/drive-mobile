import { isValidFilename } from './crypt';

describe('Filename validation', () => {
  describe('Standard filenames', () => {
    it('when a normal filename is provided, then validation passes', () => {
      expect(isValidFilename('valid_filename.jpg')).toBeTruthy();
      expect(isValidFilename('012 345.txt')).toBeTruthy();
    });

    it('when a filename without extension is provided, then validation passes', () => {
      expect(isValidFilename('0123456')).toBeTruthy();
      expect(isValidFilename('unknown_extension')).toBeTruthy();
    });

    it('when a filename contains spaces, then validation passes', () => {
      expect(isValidFilename('valid filename with spaces.jpg')).toBeTruthy();
    });

    it('when a filename contains multiple dots, then validation passes', () => {
      expect(isValidFilename('archive.tar.gz')).toBeTruthy();
      expect(isValidFilename('file.backup.2024.txt')).toBeTruthy();
    });

    it('when a filename starts with a dot, then validation passes', () => {
      expect(isValidFilename('.htaccess')).toBeTruthy();
      expect(isValidFilename('.gitignore')).toBeTruthy();
    });
  });

  describe('International characters', () => {
    it('when a filename contains unicode characters, then validation passes', () => {
      expect(isValidFilename('café ☕.txt')).toBeTruthy();
      expect(isValidFilename('文件名.pdf')).toBeTruthy();
      expect(isValidFilename('archivo_español.doc')).toBeTruthy();
      expect(isValidFilename('😀 emoji file.png')).toBeTruthy();
    });

    it('when a filename contains allowed special characters, then validation passes', () => {
      expect(isValidFilename('file@name.txt')).toBeTruthy();
      expect(isValidFilename('file#name.txt')).toBeTruthy();
      expect(isValidFilename('file$name.txt')).toBeTruthy();
      expect(isValidFilename('file%name.txt')).toBeTruthy();
      expect(isValidFilename('file&name.txt')).toBeTruthy();
      expect(isValidFilename('file(name).txt')).toBeTruthy();
      expect(isValidFilename('file[name].txt')).toBeTruthy();
      expect(isValidFilename('file{name}.txt')).toBeTruthy();
      expect(isValidFilename('file;name.txt')).toBeTruthy();
      expect(isValidFilename('file\'name.txt')).toBeTruthy();
      expect(isValidFilename('file,name.txt')).toBeTruthy();
      expect(isValidFilename('file+name.txt')).toBeTruthy();
      expect(isValidFilename('file=name.txt')).toBeTruthy();
      expect(isValidFilename('file!name.txt')).toBeTruthy();
      expect(isValidFilename('file~name.txt')).toBeTruthy();
      expect(isValidFilename('file`name.txt')).toBeTruthy();
    });
  });

  describe('Path separators', () => {
    it('when a filename contains forward slashes, then validation fails', () => {
      expect(isValidFilename('invalid/filename.jpg')).toBeFalsy();
      expect(isValidFilename('path/to/file.txt')).toBeFalsy();
    });

    it('when a filename contains backslashes, then validation fails', () => {
      expect(isValidFilename('invalid\\filename.jpg')).toBeFalsy();
      expect(isValidFilename('path\\to\\file.txt')).toBeFalsy();
    });

    it('when a filename attempts directory traversal, then validation fails', () => {
      expect(isValidFilename('../../imevil.sh')).toBeFalsy();
      expect(isValidFilename('../../../etc/passwd')).toBeFalsy();
    });
  });

  describe('Windows problematic characters', () => {
    it('when a filename contains a colon, then validation fails', () => {
      expect(isValidFilename('invalid:filename.jpg')).toBeFalsy();
    });

    it('when a filename contains angle brackets, then validation fails', () => {
      expect(isValidFilename('file<name>.txt')).toBeFalsy();
      expect(isValidFilename('file>name.txt')).toBeFalsy();
    });

    it('when a filename contains a pipe character, then validation fails', () => {
      expect(isValidFilename('file|name.txt')).toBeFalsy();
    });

    it('when a filename contains a question mark, then validation fails', () => {
      expect(isValidFilename('file?name.txt')).toBeFalsy();
    });

    it('when a filename contains an asterisk, then validation fails', () => {
      expect(isValidFilename('file*name.txt')).toBeFalsy();
    });

    it('when a filename contains double quotes, then validation fails', () => {
      expect(isValidFilename('file"name.txt')).toBeFalsy();
    });
  });

  describe('Special navigation paths', () => {
    it('when a filename is the parent directory reference, then validation fails', () => {
      expect(isValidFilename('..')).toBeFalsy();
    });

    it('when a filename is the current directory reference, then validation fails', () => {
      expect(isValidFilename('.')).toBeFalsy();
    });
  });

  describe('Empty or malformed filenames', () => {
    it('when a filename is empty, then validation fails', () => {
      expect(isValidFilename('')).toBeFalsy();
    });

    it('when a filename contains only whitespace, then validation fails', () => {
      expect(isValidFilename('   ')).toBeFalsy();
      expect(isValidFilename('\t')).toBeFalsy();
      expect(isValidFilename('\n')).toBeFalsy();
    });

    it('when a filename is undefined or null, then validation fails', () => {
      expect(isValidFilename(undefined as any)).toBeFalsy();
      expect(isValidFilename(null as any)).toBeFalsy();
    });

    it('when a filename exceeds 255 characters, then validation fails', () => {
      const longName = 'a'.repeat(256);
      expect(isValidFilename(longName)).toBeFalsy();
    });

    it('when a filename is exactly 255 characters, then validation passes', () => {
      const maxName = 'a'.repeat(255);
      expect(isValidFilename(maxName)).toBeTruthy();
    });
  });

  describe('Control characters', () => {
    it('when a filename contains a null character, then validation fails', () => {
      expect(isValidFilename('file\x00name.txt')).toBeFalsy();
    });

    it('when a filename contains line breaks, then validation fails', () => {
      expect(isValidFilename('file\nname.txt')).toBeFalsy();
      expect(isValidFilename('file\rname.txt')).toBeFalsy();
    });

    it('when a filename contains tab characters, then validation fails', () => {
      expect(isValidFilename('file\tname.txt')).toBeFalsy();
    });

    it('when a filename contains other control characters, then validation fails', () => {
      expect(isValidFilename('file\x01name.txt')).toBeFalsy();
      expect(isValidFilename('file\x1Fname.txt')).toBeFalsy();
    });
  });
});
