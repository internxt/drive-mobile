interface ItemMeta {
  name: string
  type: string
}

export function renameIfAlreadyExists(items: ItemMeta[], filename: string, type: string): [boolean, number, string] {
  const FILENAME_INCREMENT_REGEX = /( \([0-9]+\))$/i;
  const INCREMENT_INDEX_REGEX = /\(([^)]+)\)/;
  const infoFilenames: { cleanName: string; type: string; incrementIndex: number; }[] = items
    .map(item => {
      const cleanName = item.name.replace(FILENAME_INCREMENT_REGEX, '');
      const incrementString = item.name.match(FILENAME_INCREMENT_REGEX)?.pop()?.match(INCREMENT_INDEX_REGEX)?.pop();
      const incrementIndex = parseInt(incrementString || '0');

      return {
        cleanName,
        type: item.type,
        incrementIndex
      };
    })
    .filter(item => item.cleanName === filename && item.type === type)
    .sort((a, b) => b.incrementIndex - a.incrementIndex);
  const filenameExists = infoFilenames.length > 0;
  const filenameIndex = infoFilenames[0] ? (infoFilenames[0].incrementIndex + 1) : 0;
  const finalFilename = filenameIndex > 0 ? getNextNewName(filename, filenameIndex) : filename;

  return [filenameExists, filenameIndex, finalFilename];
}

export function getNextNewName(filename: string, i: number): string {
  return `${filename} (${i})`;
}