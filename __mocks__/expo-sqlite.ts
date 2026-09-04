const createMockStatement = () => ({
  executeAsync: jest.fn().mockResolvedValue(undefined),
  finalizeAsync: jest.fn().mockResolvedValue(undefined),
});

const createMockDb = () => ({
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue(undefined),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
  prepareAsync: jest.fn().mockResolvedValue(createMockStatement()),
  withTransactionAsync: jest.fn().mockImplementation(async (task: () => Promise<void>) => task()),
  closeAsync: jest.fn().mockResolvedValue(undefined),
});

export const openDatabaseAsync = jest.fn().mockImplementation(async () => createMockDb());
export const deleteDatabaseAsync = jest.fn().mockResolvedValue(undefined);
export const NativeDatabase = jest.fn();
