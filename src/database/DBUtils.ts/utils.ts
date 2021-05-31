import { getRepository } from 'typeorm/browser';
import { Photos } from '../../database/models/photos';
import { Previews } from '../../database/models/previews';
import { deviceStorage } from '../../helpers';
import { photoActions } from '../../redux/actions';
import { IApiPreview } from '../../types/api/photos/IApiPhoto';
import { Albums } from '../models/albums';
import { PhotoAlbums } from '../models/photoAlbums';
import { UrisTrash } from '../models/urisTrash';

export interface Repositories {
  photos: Photos[];
  previews: Previews[];
  albums: Albums[];
  albumsWithPreviews: PhotoAlbums[];
  urisTrash: UrisTrash[];
}

interface AlbumsRepository {
  albums: Albums[]
  albumsWithPreviews: PhotoAlbums[]
}

export async function getUserId(): Promise<string> {
  const xUser = await deviceStorage.getItem('xUser');
  const xUserJson = JSON.parse(xUser || '{}');
  const user = xUserJson.userId;

  return user;
}

export async function getRepositoriesDB(): Promise<Repositories> {
  const userId = await getUserId()

  const photosRepository = getRepository(Photos);
  const photos = await photosRepository.find({
    where: { userId: userId }
  })

  const previewsRepository = getRepository(Previews);
  const previews = await previewsRepository.find({
    where: { userId: userId }
  })

  const albumsRepository = getRepository(Albums);
  const albums = await albumsRepository.find(({
    where: { userId: userId }
  }))

  const photoAlbumsRepository = getRepository(PhotoAlbums);
  const albumsWithPreviews = []

  for (const album of albums) {
    const photoAlbums = await photoAlbumsRepository.find(({ where: { albumId: album.id } }))

    albumsWithPreviews.push(photoAlbums)
  }
  return { photos, previews, albums, albumsWithPreviews }
}

export const getAlbumsRepository = async (): Promise<AlbumsRepository> => {
  const userId = await getUserId()

  const albumsRepository = getRepository(Albums)
  const albums = await albumsRepository.find(({ where: { userId: userId } }))

  const photoAlbumsRepository = getRepository(PhotoAlbums)
  const albumsWithPreviews = []

  for (const album of albums) {
    const photoAlbums = await photoAlbumsRepository.find(({ where: { albumId: album.id } }))

    albumsWithPreviews.push(photoAlbums)
  }
  const repo: AlbumsRepository = { albums, albumsWithPreviews }

  return repo
}

export async function savePhotosAndPreviewsDB(photo: any, path: string, dispatch: any): Promise<void> {
  dispatch(photoActions.viewDB())

  const userId = await getUserId()

  const photosRepository = getRepository(Photos);

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

  const previewsRepository = getRepository(Previews);

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
  newPreview.isUploaded = true,
  newPreview.isDownloading = false
  newPreview.isUploading = false

  const existsfileId = await previewsRepository.findOne({
    where: {
      fileId: photo.preview.fileId
    }
  })

  if (existsfileId === undefined) {
    await previewsRepository.save(newPreview);
    dispatch(photoActions.startSaveDB())
  }

  await previewsRepository.find({
    where: {
      userId: userId
    }
  })
}

export async function saveAlbumsDB(listPhotos: number[], name: string): Promise<void> {
  const userId = await getUserId()
  const albumRepository = getRepository(Albums);

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

  const albumPhotosRepository = getRepository(PhotoAlbums);

  await albumPhotosRepository.find({})

  for (const id of listPhotos) {
    const newPhotosAlbum = new PhotoAlbums();

    newPhotosAlbum.albumId = newAlbum.id
    newPhotosAlbum.previewId = id

    await albumPhotosRepository.save(newPhotosAlbum)
  }

  await albumPhotosRepository.find({})
}

export async function deleteAlbumDB(id: number) {
  const albumsRepository = getRepository(Albums);
  const photoAlbumsRepository = getRepository(PhotoAlbums);
  const userId = getUserId()

  const albums = await albumsRepository.findOne(({
    where: {
      userId: userId,
      id: id
    }
  }))

  const removeAlbum = await albumsRepository.remove(albums)

  await albumsRepository.find({})

  const photosAlbums = await photoAlbumsRepository.find(({
    where: {
      albumId: id
    }
  }))

  const removePhotosAlbums = await photoAlbumsRepository.remove(photosAlbums)

  await photoAlbumsRepository.find({})
}

export async function deletePhotoFromAlbumDB(albumId: number, photoId: number) {
  const photoAlbumsRepository = getRepository(PhotoAlbums);

  const photosAlbums = await photoAlbumsRepository.findOne(({
    where: {
      albumId: albumId,
      photoId: photoId
    }
  }))

  const removePhoto = await photoAlbumsRepository.remove(photosAlbums)

  await photoAlbumsRepository.find({})
}

export async function addPhotoToAlbumDB(albumId: number, photoId: number) {
  const photoAlbumsRepository = getRepository(PhotoAlbums);

  await photoAlbumsRepository.find(({
    where: {
      albumId: albumId
    }
  }))

  const newPhotoToAlbum = new PhotoAlbums();

  newPhotoToAlbum.albumId = albumId
  newPhotoToAlbum.previewId = photoId

  await photoAlbumsRepository.save(newPhotoToAlbum);

  await photoAlbumsRepository.find({})
}

export async function updateNameAlbumDB(albumId: number, name: string) {
  const albumsRepository = getRepository(Albums);

  const albums = await albumsRepository.findOne(({
    where: {
      albumId: albumId
    }
  }))

  albums.name = name;
  await albumsRepository.save(albums);
}

export async function checkExistsAlbumDB(name: string) {
  const albumsRepository = getRepository(Albums);

  const album = await albumsRepository.findOne(({
    where: {
      name: name
    }
  }))

  if (!album) {
    return false;
  }
  return true;
}

export async function saveUrisTrash(fileId: string, path: string) {
  const urisTrashRepository = getRepository(UrisTrash);
  const userId = await getUserId()

  await urisTrashRepository.findOne(({
    where: {
      userId: userId
    }
  }))

  const newUri = new UrisTrash()

  newUri.uri = path
  newUri.userId = userId
  newUri.fileId = fileId

  const existsPhotoFileId = await urisTrashRepository.findOne({
    where: {
      fileId: fileId
    }
  })

  if (existsPhotoFileId === undefined) {
    await urisTrashRepository.save(newUri);
  }

  await urisTrashRepository.find({
    where: {
      userId: userId
    }
  })
}

export async function updateLocalUriPreviews(preview: IApiPreview, path: string) {
  const previwesRepository = getRepository(Previews);
  const userId = await getUserId();

  const previews = await previwesRepository.findOne(({
    where: {
      fileId: preview.fileId,
      userId: userId
    }
  }))

  previews.localUri = path;
  await previwesRepository.save(previews);
}

export async function removeUrisFromUrisTrash(fileId: string) {
  const urisTrashRepository = getRepository(UrisTrash);
  const userId = await getUserId()

  const uris = await urisTrashRepository.findOne(({
    where: {
      userId: userId,
      fileId: fileId
    }
  }))

  await urisTrashRepository.remove(uris)
  await urisTrashRepository.find({})
  return uris;
}

export async function checkExistsUriTrash(fileId: string) {
  const urisTrashRepository = getRepository(UrisTrash);
  const userId = await getUserId()

  const uris = await urisTrashRepository.findOne(({
    where: {
      userId: userId,
      fileId: fileId
    }
  }))

  if (uris === undefined) {
    return false;
  }

  return uris;
}
