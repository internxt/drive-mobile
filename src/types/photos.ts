export interface PhotoDevice {
  uuid: string;
  plainName: string;
  bucket: string;
  status: 'EXISTS' | 'TRASHED' | 'DELETED';
}
