import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

describe('bip39 mnemonic validation', () => {
  describe('validateMnemonic', () => {
    describe('when validating a correctly formatted mnemonic', () => {
      it('returns true for a valid 12-word mnemonic', () => {
        const mnemonic =
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(true);
      });

      it('returns true for a valid 24-word mnemonic', () => {
        const mnemonic =
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(true);
      });
    });

    describe('when validating a mnemonic with invalid words', () => {
      it('returns false when words are not in the BIP39 wordlist', () => {
        const mnemonic = 'invalid words that are not in the bip39 wordlist at all testing now';

        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(false);
      });

      it('returns false when mnemonic contains unicode characters', () => {
        const mnemonic =
          'ábandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(false);
      });

      it('returns false when mnemonic contains uppercase letters', () => {
        const mnemonic =
          'Abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(false);
      });
    });

    describe('when validating a mnemonic with incorrect checksum', () => {
      it('returns false when the last word produces invalid checksum', () => {
        const mnemonic =
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';

        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(false);
      });
    });

    describe('when validating a mnemonic with incorrect word count', () => {
      it('returns false for 11-word mnemonic', () => {
        const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';

        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(false);
      });

      it('returns false for empty string', () => {
        expect(bip39.validateMnemonic('', wordlist)).toBe(false);
      });
    });

    describe('when validating a mnemonic with whitespace issues', () => {
      it('returns false when mnemonic has double spaces between words', () => {
        const mnemonic =
          'abandon  abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(false);
      });

      it('returns false when mnemonic has leading or trailing spaces', () => {
        const mnemonic =
          ' abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about ';

        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(false);
      });
    });
  });

  describe('generateMnemonic', () => {
    describe('when generating a new mnemonic', () => {
      it('generates a valid 12-word mnemonic with 128 bits of entropy', () => {
        const mnemonic = bip39.generateMnemonic(wordlist, 128);
        const words = mnemonic.split(' ');

        expect(words).toHaveLength(12);
        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(true);
      });

      it('generates a valid 24-word mnemonic with 256 bits of entropy', () => {
        const mnemonic = bip39.generateMnemonic(wordlist, 256);
        const words = mnemonic.split(' ');

        expect(words).toHaveLength(24);
        expect(bip39.validateMnemonic(mnemonic, wordlist)).toBe(true);
      });

      it('generates unique mnemonics on consecutive calls', () => {
        const mnemonic1 = bip39.generateMnemonic(wordlist, 128);
        const mnemonic2 = bip39.generateMnemonic(wordlist, 128);

        expect(mnemonic1).not.toBe(mnemonic2);
      });
    });
  });

  describe('mnemonicToSeed', () => {
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    describe('when deriving seed from mnemonic', () => {
      it('produces a 64-byte seed', async () => {
        const seed = await bip39.mnemonicToSeed(testMnemonic);

        expect(seed.length).toBe(64);
      });

      it('produces consistent seed for the same mnemonic', async () => {
        const seed1 = await bip39.mnemonicToSeed(testMnemonic);
        const seed2 = await bip39.mnemonicToSeed(testMnemonic);

        expect(Buffer.from(seed1).toString('hex')).toBe(Buffer.from(seed2).toString('hex'));
      });
    });

    describe('when using a passphrase', () => {
      it('produces different seed than without passphrase', async () => {
        const seedWithoutPassphrase = await bip39.mnemonicToSeed(testMnemonic);
        const seedWithPassphrase = await bip39.mnemonicToSeed(testMnemonic, 'mypassphrase');

        expect(Buffer.from(seedWithoutPassphrase).toString('hex')).not.toBe(
          Buffer.from(seedWithPassphrase).toString('hex'),
        );
      });
    });
  });

  describe('wordlist', () => {
    describe('when checking wordlist integrity', () => {
      it('contains exactly 2048 words as per BIP39 specification', () => {
        expect(wordlist).toHaveLength(2048);
      });

      it('contains expected BIP39 words', () => {
        expect(wordlist).toContain('abandon');
        expect(wordlist).toContain('zoo');
        expect(wordlist).toContain('ability');
      });

      it('is sorted alphabetically', () => {
        const sortedWordlist = [...wordlist].sort((a, b) => a.localeCompare(b));

        expect(wordlist).toEqual(sortedWordlist);
      });
    });
  });
});
