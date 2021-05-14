import { getRepository } from 'typeorm/browser';
import { Photos } from '../../database/models/photos';
import { Previews } from '../../database/models/previews';
import { deviceStorage } from '../../helpers';
import { PhotoActions } from '../../redux/actions';
import { Albums } from '../models/albums';
import { PhotoAlbums } from '../models/photoAlbums';

export interface Repositories {
  photos: Photos[];
  previews: Previews[];
  albums: Albums[];
  albumsWithPreviews: PhotoAlbums[];
}

export async function getUserId() {
  const xUser = await deviceStorage.getItem('xUser');
  const xUserJson = JSON.parse(xUser || '{}');
  const user = xUserJson.userId;

  return user;
}

export async function getRepositories(): Promise<Repositories> {
  const userId = await getUserId()

  const photosRepository = await getRepository(Photos);
  const previewsRepository = await getRepository(Previews);
  const albumsRepository = await getRepository(Albums);
  const photoAlbumsRepository = await getRepository(PhotoAlbums);
  const albumsWithPreviews = []

  const photos = await photosRepository.find({
    where: { userId: userId }
  })

  const previews = await previewsRepository.find({
    where: { userId: userId }
  })

  const albums = await albumsRepository.find(({
    where: { userId: userId }
  }))

  albums.map(async (res)=>{
    const photoAlbums = await photoAlbumsRepository.find(({
      where: { albumId: res.id }
    }))

    albumsWithPreviews.push(photoAlbums)

  })

  return { photos, previews, albums, albumsWithPreviews }
}

export async function savePhotosAndPreviews(photo: any, path: string, dispatch: any) {
  dispatch(PhotoActions.viewDB())

  const userId = await getUserId()

  const photosRepository = getRepository(Photos);

  const previewsRepository = getRepository(Previews);

  await photosRepository.find({
    where: { userId: userId }
  })

  const newPhoto = new Photos()

  newPhoto.photoId = photo.id
  newPhoto.fileId = photo.fileId
  newPhoto.hash = photo.hash
  newPhoto.name = photo.name
  newPhoto.type = photo.type
  newPhoto.userId = userId

  const existsPhotoFileId = await photosRepository.findOne({
    where: {
      fileId: photo.fileId
    }
  })

  if (existsPhotoFileId === undefined) {
    await photosRepository.save(newPhoto);
  }

  await photosRepository.find({
    where: { userId: userId }
  });

  await previewsRepository.find({
    where: {
      userId: userId
    }
  })

  const newPreview = new Previews();

  newPreview.fileId = photo.preview.fileId;
  newPreview.hash = photo.hash;
  newPreview.name = photo.preview.name;
  newPreview.type = photo.preview.type;
  newPreview.photoId = photo.preview.photoId;
  newPreview.localUri = path;
  newPreview.userId = userId
  newPreview.isLocal = false,
  newPreview.isUploaded = true

  const existsfileId = await previewsRepository.findOne({
    where: {
      fileId: photo.preview.fileId
    }
  })

  if (existsfileId === undefined) {
    await previewsRepository.save(newPreview);
    dispatch(PhotoActions.startSaveDB())
  }

  await previewsRepository.find({
    where: {
      userId: userId
    }
  })
}

export async function saveAlbums(listPhotos: Previews[], name: string) {
  const userId = await getUserId()

  const albumRepository = getRepository(Albums);

  const albumPhotosRepository = getRepository(PhotoAlbums);

  await albumRepository.find({
    where: { userId: userId }
  })

  const newAlbum = new Albums()

  newAlbum.userId = userId
  newAlbum.name = name

  await albumRepository.save(newAlbum);

  await albumRepository.find({
    where: { userId: userId }
  });

  await albumPhotosRepository.find({})

  const newPhotosAlbum = new PhotoAlbums();

  listPhotos.map((res) => {

    newPhotosAlbum.albumId = newAlbum.id
    newPhotosAlbum.previewId = res.photoId
  })

  await albumPhotosRepository.save(newPhotosAlbum);

  await albumPhotosRepository.find({})
}
