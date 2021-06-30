import { Asset } from 'expo-media-library';

// * Photos interfaces
export interface LocalImages {
  endCursor: string | undefined
  assets: IHashedPhoto[]
  hasNextPage: boolean
}

export interface IHashedPhoto extends Asset {
  hash: string,
  localUri: string | undefined
  photoId: number
  type: string
}

export interface IUploadedPhoto {
  photo: IAPIPhoto,
  preview: IApiPreview
}

export interface IPhotosToRender {
  [hash: string]: IPhotoToRender
}

export interface IPhotoToRender extends IHashedPhoto {
  isLocal: boolean,
  isUploaded: boolean,
  isDownloading: boolean,
  isUploading: boolean,
  isSelected: boolean
}

export interface IAPIPhoto {
  bucketId: string
  createdAt: Date
  creationTime: Date
  device: string | null
  fileId: string
  hash: string
  id: number
  name: string
  size: number
  type: string
  updatedAt: Date
  userId: number
}

export interface IApiPreview {
  bucketId: string
  createdAt: Date
  fileId: string
  hash: string | null
  id: number
  name: string
  photoId: number
  size: number
  type: string
  updatedAt: Date
}

export interface IApiPhotoWithPreview extends IAPIPhoto {
  preview: IApiPreview
}

// * Albums interfaces
export interface IAPIAlbum {
  createdAt: Date
  id: number
  name: string
  photos: IAPIPhoto[]
  updatedAt: Date
  userId: number
}

export interface ISaveableAlbum {
  name: string
  photos: number[]
}

export interface ISelectedPhoto {
  hash: string
  photoId: number
}

export interface IAlbumsToRender {
  [albumId: string]: {
    hashes: string[],
    name: string
  }
}
