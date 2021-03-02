import { mapSeries } from 'async';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Asset, getAssetInfoAsync } from 'expo-media-library';
import { Platform } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import * as Permissions from 'expo-permissions';
import * as MediaLibrary from 'expo-media-library';
import RNFS from 'react-native-fs';

const getArrayPhotos = async(images: Asset[]) => {
  const result = mapSeries(images, async (image, next) => {

    const asset = await getAssetInfoAsync(image)

    const sha256Id = await RNFS.hash(asset.localUri, 'sha256')

    const file = {
      uri: asset.localUri,
      id: asset.id,
      hash: sha256Id,
      name: asset.filename
    }

    next(null, file)
  });

  return result;
}

export function syncPhotos(images: Asset[], props: any) {
  getArrayPhotos(images).then((res)=>{

    const result = mapSeries(res, (image, next) => {

      uploadPhoto(image, props).then(() => next(null)).catch(next)
    });
  });
}
export async function uploadPhoto (result: any, props: any) {

  try {
    // Set name for pics/photos
    if (!result.name) {
      result.name = result.split('/').pop();
    }

    const token = props.authenticationState.token;
    const mnemonic = props.authenticationState.user.mnemonic;
    const regex = /^(.*:\/{0,2})\/?(.*)$/gm

    const body = new FormData();

    body.append('xfile', result, result.name);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'internxt-mnemonic': mnemonic,
      'Content-Type': 'multipart/form-data'
    };

    const file = result.uri.replace(regex, '$2')

    const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(result.uri);

    return RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/photo/upload`, headers,
      [
        { name: 'xfile', filename: result.name, data: finalUri },
        { name: 'hash', data: result.hash }
      ])
      .then((res) => {
        if (res.respInfo.status === 401) {
          throw res;
        } else if (res.respInfo.status === 402) {
          //setHasSpace(false)

        } else if (res.respInfo.status === 201) {
          return res.json();
        }
        return
      })
      .then(async res => {
        // Create photo preview and store on device
        const prev = await manipulateAsync(
          result.uri,
          [{ resize: { width: 220 } }],
          { compress: 1, format: SaveFormat.JPEG }
        )
        const preview = {
          uri: prev.uri,
          height: prev.height,
          widht: prev.width,
          name: result.name,
          photoId: res.id
        };

        return uploadPreview(preview, props, headers);
      })
      .catch((err) => {
      })

  } catch (err) {
    return
  }
}

const uploadPreview = async (preview: any, props: any, headers: any) => {
  const body = new FormData();

  preview.uri.replace('file:///', 'file:/');

  body.append('xfile', preview, preview.name);
  body.append('photoId', preview.photoId);

  const regex = /^(.*:\/{0,2})\/?(.*)$/gm
  const file = preview.uri.replace(regex, '$2')

  const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(preview.uri);

  return RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/preview/upload/${preview.photoId}`, headers,
    [
      { name: 'xfile', filename: body._parts[0][1].name, data: finalUri }
    ])
    .then((res) => {
      if (res.respInfo.status === 401) {
        throw res;
      }

      const data = res;

      return { res: res, data };
    })
    .then(res => {
      if (res.res.respInfo.status === 402) {

      } else if (res.res.respInfo.status === 201) {
        // PREVIEW UPLOADED
        return
      }
    })
    .catch((err) => {
      return
    })
}

export function getImages() {
  return Permissions.askAsync(Permissions.MEDIA_LIBRARY)
    .then(() => {
      return MediaLibrary.getAssetsAsync();
    })
    .then((result) => {
      return result.assets;
    });
}
