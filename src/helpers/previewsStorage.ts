import { Console } from 'console';
import * as FileSystem from 'expo-file-system';

export const previewsStorage = { 
    existsPreviewFolder,
    storePreview,
    getPreviews
  }
  
async function existsPreviewFolder() {
    console.log("DIRECTORY: ---------------", FileSystem.documentDirectory)

    let folder = await FileSystem.getInfoAsync(FileSystem.documentDirectory + "previews");

    console.log("PREVIEWS FOLDER", folder)

    if (folder && !folder.exists) {
      return false;
    } else {
      return true;
    }
  }

  
async function storePreview(image?: any) {
    if (!existsPreviewFolder()) {
      console.log("CREATING PREVIEW FOLDER")
      FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + "previews");
    }
    //const id = image.id.toString();
  
    /*const source = await FileSystem.readAsStringAsync(
      image.uri
    );
  
    /*let stored = await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + "previews/" + id + '.jpg',
        image.uri,
        { encoding: FileSystem.EncodingType.Base64 }
    );*/
}

async function getPreviews() {
    let previews: any[] = [];
    if (existsPreviewFolder()) {
      let folder = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory + "previews");
      folder.forEach((prev) => {
        previews.push(prev);
      })
    }
  
    return previews;
  }
