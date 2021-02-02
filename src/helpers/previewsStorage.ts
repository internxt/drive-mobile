import { Console } from 'console';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export const previewsStorage = {
  existsPreviewFolder,
  createPreview,
  storePreview,
  getPreviews
}

async function existsPreviewFolder() {
  let folder = await FileSystem.getInfoAsync(FileSystem.documentDirectory + 'previews');

  console.log("PREVIEWS FOLDER", folder)

  if (folder && !folder.exists) {
    await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'previews');
    return true;
  } else {
    return true;
  }
}

function createPreview(imageUri: any) {
  ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 110, height: 110 } }],
    { compress: 0, format: ImageManipulator.SaveFormat.JPEG }
  )
    .then((result) => {
      return result;
    })
    .catch((err) => {
      console.log("[ ERROR CREATING PREVIEW ]", err)
    })
}

async function storePreview(previewUri: any, name: string) {
  const stored = await FileSystem.copyAsync({
    from: previewUri,
    to: FileSystem.documentDirectory + 'previews/' + name
  });

  return FileSystem.documentDirectory + 'previews/' + name;
}

async function getPreviews() {
  let previews: any[] = [];

  const folder = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory + "previews");

  folder.forEach((prev) => {
    previews.push(prev);
  })
  return previews;
}
