const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue(undefined),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
};

export const openDatabaseAsync = jest.fn().mockResolvedValue(mockDb);
export const NativeDatabase = jest.fn();
