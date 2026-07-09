import { resolveAssetCreationTime } from './resolveAssetCreationTime';

const VALID_TIMESTAMP = new Date('2026-06-26T10:00:00Z').getTime();

describe('resolving the reliable creation time of a photo asset', () => {
  test('when creation time is a plausible date, then it is used as is', () => {
    const result = resolveAssetCreationTime(VALID_TIMESTAMP, VALID_TIMESTAMP + 1000);

    expect(result).toBe(VALID_TIMESTAMP);
  });

  test('when creation time is zero, then modification time is used instead', () => {
    const result = resolveAssetCreationTime(0, VALID_TIMESTAMP);

    expect(result).toBe(VALID_TIMESTAMP);
  });

  test('when creation time predates 1980, then modification time is used instead', () => {
    const result = resolveAssetCreationTime(1, VALID_TIMESTAMP);

    expect(result).toBe(VALID_TIMESTAMP);
  });

  test('when creation time is missing and modification time is plausible, then modification time is used', () => {
    const result = resolveAssetCreationTime(null, VALID_TIMESTAMP);

    expect(result).toBe(VALID_TIMESTAMP);
  });

  test('when both creation time and modification time are implausible, then the original creation time is kept', () => {
    const result = resolveAssetCreationTime(0, 0);

    expect(result).toBe(0);
  });

  test('when both creation time and modification time are missing, then null is returned', () => {
    const result = resolveAssetCreationTime(null, undefined);

    expect(result).toBeNull();
  });
});
