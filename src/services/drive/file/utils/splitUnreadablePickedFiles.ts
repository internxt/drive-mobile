interface PickedFileMetadata {
  name: string | null;
  error: string | null;
}

type ReadablePickedFile<PickedFile extends PickedFileMetadata> = PickedFile & { name: string };

/**
 * Splits the files returned by the document picker into the ones whose metadata could be read and the ones the
 * picker reported with an `error` or without a name.
 */
export const splitUnreadablePickedFiles = <PickedFile extends PickedFileMetadata>(pickedFiles: PickedFile[]) => {
  const readablePickedFiles: ReadablePickedFile<PickedFile>[] = [];
  const unreadablePickedFiles: PickedFile[] = [];

  for (const pickedFile of pickedFiles) {
    if (pickedFile.error || !pickedFile.name) {
      unreadablePickedFiles.push(pickedFile);
    } else {
      readablePickedFiles.push(pickedFile as ReadablePickedFile<PickedFile>);
    }
  }

  return { readablePickedFiles, unreadablePickedFiles };
};
