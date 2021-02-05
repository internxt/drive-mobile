import { Console } from 'console';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export const previewsStorage = {
  existsPreviewFolder,
  createPreview,
  existsPreview,
  storePreview,
  getPreviews,
  matchPreviews
}

async function existsPreviewFolder() {
  const folder = await FileSystem.getInfoAsync(FileSystem.documentDirectory + 'previews');

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

async function existsPreview(name: string) {
  const dir = await FileSystem.readDirectoryAsync(
    FileSystem.documentDirectory + 'previews'
  );

  if (dir.length > 0) {
    const existingPrev = dir.filter((x) => x === name);

    if (existingPrev.length > 0) {
      let uri = FileSystem.documentDirectory + 'previews/' + existingPrev[0];

      uri = uri.replace('file:///', 'file://');
      return uri;
    }
  }

  return false;
}

async function storePreview(previewUri: any, name: string) {
  const exists = await FileSystem.readDirectoryAsync(
    FileSystem.documentDirectory + 'previews'
  );

  if (exists.length > 0) {
    const existingPrev = exists.find((x) => x === name);

    if (existingPrev) {
      return;
    }
  }
  await FileSystem.copyAsync({
    from: previewUri,
    to: FileSystem.documentDirectory + 'previews/' + name
  });

  return FileSystem.documentDirectory + 'previews/' + name;
}

async function getPreviews() {
  let previews: any[] = [];

  const folder = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory + "previews");

  folder.forEach((prevName) => {
    const uri = FileSystem.documentDirectory + 'previews/' + prevName;

    previews.push(uri);
  })

  console.log("PREVIEW URIS---", previews)
  return previews;
}

async function matchPreviews(photos) {
  const previews = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory + 'previews');

  const prevPhotos = photos.map((photo) => {
    if (!photo.preview) {
      const exists = previews.filter((p) => p === (photo.name + '.' + photo.type));

      if (exists.length > 0) {
        photo.preview = FileSystem.documentDirectory + 'previews/' + photo.name + '.jpg';
        photo.preview.replace('file:///', 'file://');
      } else {
        // TODO: Request preview to the network.
      }
    }
    return photo;
  })

  return prevPhotos;
}
