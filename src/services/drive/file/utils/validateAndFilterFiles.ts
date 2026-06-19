import { isValidFilename } from '../../../../helpers';
import { DocumentPickerFile } from '../../../../types/drive/operations';

/**
 * Validate file names and filter out files exceeding the plan's max upload size.
 * `maxUploadFileSize === 0` means unlimited/unknown — no filtering.
 */
export function validateAndFilterFiles(documents: DocumentPickerFile[], maxUploadFileSize: number) {
  const invalidFiles = documents.filter((file) => !isValidFilename(file.name));
  if (invalidFiles.length > 0) {
    const invalidFileNames = invalidFiles.map((f) => f.name).join(', ');
    throw new Error(`Invalid file names: ${invalidFileNames}`);
  }

  const filesToUpload: DocumentPickerFile[] = [];
  const filesExcluded: DocumentPickerFile[] = [];
  for (const file of documents) {
    if (maxUploadFileSize === 0 || file.size <= maxUploadFileSize) {
      filesToUpload.push(file);
    } else {
      filesExcluded.push(file);
    }
  }

  return { filesToUpload, filesExcluded };
}
