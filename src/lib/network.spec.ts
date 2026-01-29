import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { getEnvironmentConfigFromUser } from './network';

const createMockUser = (overrides?: Partial<UserSettings>): UserSettings => ({
  email: 'test@example.com',
  userId: 'user-123',
  uuid: 'uuid-456',
  name: 'Test',
  lastname: 'User',
  username: 'testuser',
  bridgeUser: 'bridge-user@example.com',
  bucket: 'bucket-789',
  mnemonic: 'test mnemonic phrase for encryption key',
  root_folder_id: 1,
  rootFolderId: 'root-folder-uuid',
  rootFolderUuid: 'root-folder-uuid',
  sharedWorkspace: false,
  credit: 0,
  createdAt: new Date(),
  registerCompleted: true,
  teams: false,
  hasReferralsProgram: false,
  backupsBucket: null,
  avatar: null,
  emailVerified: true,
  privateKey: 'private-key',
  publicKey: 'public-key',
  revocationKey: 'revocation-key',
  appSumoDetails: null,
  keys: {
    ecc: { publicKey: 'ecc-public', privateKey: 'ecc-private' },
    kyber: { publicKey: 'kyber-public', privateKey: 'kyber-private' },
  },
  ...overrides,
});

describe('getEnvironmentConfigFromUser', () => {
  describe('when extracting environment config from user', () => {
    it('returns correct field mappings', () => {
      const user = createMockUser({
        bridgeUser: 'bridge@internxt.com',
        userId: 'user-id-123',
        mnemonic: 'my secret mnemonic phrase',
        bucket: 'my-bucket-id',
      });

      const config = getEnvironmentConfigFromUser(user);

      expect(config).toEqual({
        bridgeUser: 'bridge@internxt.com',
        bridgePass: 'user-id-123',
        encryptionKey: 'my secret mnemonic phrase',
        bucketId: 'my-bucket-id',
      });
    });
  });

  describe('when user has empty values', () => {
    it('returns empty strings for empty user fields', () => {
      const user = createMockUser({
        bridgeUser: '',
        userId: '',
        mnemonic: '',
        bucket: '',
      });

      const config = getEnvironmentConfigFromUser(user);

      expect(config.bridgeUser).toBe('');
      expect(config.bridgePass).toBe('');
      expect(config.encryptionKey).toBe('');
      expect(config.bucketId).toBe('');
    });
  });

  describe('when checking function behavior', () => {
    it('returns synchronously without Promise', () => {
      const user = createMockUser();

      const result = getEnvironmentConfigFromUser(user);

      expect(result).not.toBeInstanceOf(Promise);
      expect(result.bridgeUser).toBeDefined();
    });

    it('executes instantly without external storage access', () => {
      const user = createMockUser();
      const startTime = Date.now();

      const config = getEnvironmentConfigFromUser(user);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10);
      expect(config).toBeDefined();
    });
  });
});
