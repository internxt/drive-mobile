import { buildCandidates, extractBaseName, FolderNameChecker, getUniqueFolderName } from './getUniqueFolderName';

const PARENT_UUID = 'parent-uuid-123';

const makeChecker = (taken: string[] = []): FolderNameChecker => jest.fn().mockResolvedValue(new Set(taken));

describe('extractBaseName', () => {
  describe('when name has a trailing " (n)" suffix', () => {
    it('when suffix is a single digit, then strips it', () => {
      expect(extractBaseName('Photos (1)')).toBe('Photos');
    });

    it('when suffix has multiple digits, then strips it', () => {
      expect(extractBaseName('Documents (100)')).toBe('Documents');
    });
  });

  describe('when name has no trailing suffix', () => {
    it('when name is plain, then returns it unchanged', () => {
      expect(extractBaseName('Photos')).toBe('Photos');
    });

    it('when name is an empty string, then returns an empty string', () => {
      expect(extractBaseName('')).toBe('');
    });
  });

  describe('when parentheses are not a trailing numeric suffix', () => {
    it('when parentheses are in the middle of the name, then does not strip them', () => {
      expect(extractBaseName('My (photos) backup')).toBe('My (photos) backup');
    });

    it('when parentheses contain non-digit text, then does not strip them', () => {
      expect(extractBaseName('My Folder (copy)')).toBe('My Folder (copy)');
    });
  });
});

describe('buildCandidates', () => {
  it('when count is 3 and fromCounter is 1, then returns three sequential candidates', () => {
    expect(buildCandidates('Photos', 1, 3)).toEqual(['Photos (1)', 'Photos (2)', 'Photos (3)']);
  });

  it('when fromCounter is 5, then starts from (5)', () => {
    expect(buildCandidates('Photos', 5, 2)).toEqual(['Photos (5)', 'Photos (6)']);
  });

  it('when count is 1, then returns a single candidate', () => {
    expect(buildCandidates('Photos', 1, 1)).toEqual(['Photos (1)']);
  });

  it('when count is 0, then returns an empty array', () => {
    expect(buildCandidates('Photos', 1, 0)).toEqual([]);
  });
});

describe('getUniqueFolderName', () => {
  describe('when the first candidate is free', () => {
    it('then returns "<base> (1)"', async () => {
      const result = await getUniqueFolderName('Photos', PARENT_UUID, makeChecker());
      expect(result).toBe('Photos (1)');
    });
  });

  describe('when some candidates are already taken', () => {
    it('when the first candidate is taken, then returns the next free one', async () => {
      const result = await getUniqueFolderName('Photos', PARENT_UUID, makeChecker(['Photos (1)']));
      expect(result).toBe('Photos (2)');
    });
  });

  describe('when folderName already has a trailing suffix', () => {
    it('then strips it and searches from (1)', async () => {
      const result = await getUniqueFolderName('Photos (3)', PARENT_UUID, makeChecker());
      expect(result).toBe('Photos (1)');
    });
  });

  describe('when verifying API call behaviour', () => {
    it('then passes the correct parentFolderUuid to the checker', async () => {
      const checker = makeChecker();
      await getUniqueFolderName('Photos', PARENT_UUID, checker);
      expect(checker).toHaveBeenCalledWith(PARENT_UUID, expect.any(Array));
    });

    it('then sends candidates in a batch instead of one by one', async () => {
      const checker = makeChecker();
      await getUniqueFolderName('Photos', PARENT_UUID, checker);
      expect(checker).toHaveBeenCalledTimes(1);
      const [, names] = (checker as jest.Mock).mock.calls[0];
      expect(names.length).toBeGreaterThan(1);
    });
  });

  describe('when the entire first batch is taken', () => {
    it('then queries the next batch and returns the first free name', async () => {
      const BATCH_SIZE = 100;
      const firstBatch = Array.from({ length: BATCH_SIZE }, (_, i) => `Photos (${i + 1})`);

      const checker: FolderNameChecker = jest
        .fn()
        .mockResolvedValueOnce(new Set(firstBatch))
        .mockResolvedValue(new Set());

      const result = await getUniqueFolderName('Photos', PARENT_UUID, checker);

      expect(checker).toHaveBeenCalledTimes(2);
      expect(result).toBe(`Photos (${BATCH_SIZE + 1})`);
    });
  });

  describe('when all possible names are taken', () => {
    it('then throws a descriptive error', async () => {
      const checker: FolderNameChecker = jest.fn().mockImplementation(async (_, names) => new Set(names));

      await expect(getUniqueFolderName('Photos', PARENT_UUID, checker)).rejects.toThrow(
        'No unique name found for "Photos"',
      );
    });
  });
});
