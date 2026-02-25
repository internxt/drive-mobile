import { driveFolderService } from '../driveFolder.service';

const MAX_ATTEMPTS = 10000;
const BATCH_SIZE = 100;
const TRAILING_NUMERIC_SUFFIX = /\s\(\d+\)$/;

export type FolderNameChecker = (parentFolderUuid: string, names: string[]) => Promise<Set<string>>;

/**
 * Strips any trailing " (n)" suffix from `name`, returning the base name.
 *
 * @param name - Folder name to normalize.
 * @returns The base name without a numeric suffix.
 */
export const extractBaseName = (name: string): string => name.replace(TRAILING_NUMERIC_SUFFIX, '');

/**
 * Generates `count` sequential candidates starting at `fromCounter`.
 *
 * @param base - Base folder name.
 * @param fromCounter - Starting counter value (inclusive).
 * @param count - Number of candidates to generate.
 * @returns Array of candidate names in the form `"<base> (n)"`.
 */
export const buildCandidates = (base: string, fromCounter: number, count: number): string[] =>
  Array.from({ length: count }, (_, i) => `${base} (${fromCounter + i})`);

const defaultChecker: FolderNameChecker = async (parentFolderUuid, names) => {
  const { existentFolders } = await driveFolderService.checkDuplicatedFolders(parentFolderUuid, names);
  return new Set(existentFolders.map((file) => file.plainName ?? file.plain_name));
};

/**
 * Returns the first available folder name following the pattern `"<base> (n)"`.
 *
 *
 * @param folderName - Desired folder name, with or without a trailing `" (n)"` suffix.
 * @param parentFolderUuid - UUID of the parent folder where uniqueness is checked.
 * @param checkExists - Injectable checker (defaults to `driveFolderService`). Useful for testing.
 * @returns The first available candidate name.
 * @throws {Error} If no unique name is found within {@link MAX_ATTEMPTS} attempts.
 */
export const getUniqueFolderName = async (
  folderName: string,
  parentFolderUuid: string,
  checkExists: FolderNameChecker = defaultChecker,
): Promise<string> => {
  const base = extractBaseName(folderName);

  for (let startCounter = 1; startCounter <= MAX_ATTEMPTS; startCounter += BATCH_SIZE) {
    const candidates = buildCandidates(base, startCounter, BATCH_SIZE);
    const taken = await checkExists(parentFolderUuid, candidates);
    const free = candidates.find((candidate) => !taken.has(candidate));
    if (free) return free;
  }

  throw new Error(`No unique name found for "${base}" after ${MAX_ATTEMPTS} attempts`);
};
