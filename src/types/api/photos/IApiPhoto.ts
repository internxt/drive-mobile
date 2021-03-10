export interface IAPIPhoto {
    bucketId: string
    createdAt: Date
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