import { PhotoDateGroup, PhotoItem } from './types';

const MOCK_URIS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
  'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=400',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=400',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400',
];

const makePhotos = (prefix: string, count: number, backupState: PhotoItem['backupState'] = 'backed'): PhotoItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    uri: MOCK_URIS[i % MOCK_URIS.length],
    backupState,
    mediaType: (i % 5 === 0 ? 'video' : 'photo') as PhotoItem['mediaType'],
    duration: i % 5 === 0 ? '0:24' : undefined,
  }));

const MOCK_GROUP: PhotoDateGroup = {
  id: 'today',
  label: 'Today',
  photos: Array.from({ length: 21 }, (_, i) => ({
    id: `loading-${i}`,
    backupState: 'loading' as const,
    mediaType: 'photo' as const,
  })),
};

const MOCK_GROUP_BACKING_UP: PhotoDateGroup = {
  id: 'today-backing-up',
  label: 'Today',
  photos: Array.from({ length: 21 }, (_, i) => ({
    id: `backup-${i}`,
    uri: MOCK_URIS[i % MOCK_URIS.length],
    backupState: (i < 3 ? 'uploading' : i % 4 === 0 ? 'not-backed' : 'backed') as PhotoItem['backupState'],
    uploadProgress: i < 3 ? [0.3, 0.65, 0.9][i] : undefined,
    mediaType: (i % 5 === 0 ? 'video' : 'photo') as PhotoItem['mediaType'],
    duration: i % 5 === 0 ? '0:24' : undefined,
  })),
};

const MOCK_MULTI_DATE_GROUPS: PhotoDateGroup[] = [
  { id: 'today', label: 'Today', photos: makePhotos('today', 12) },
  { id: 'yesterday', label: 'Yesterday', photos: makePhotos('yesterday', 18) },
  { id: '14-apr-2026', label: '14 Apr 2026', photos: makePhotos('14apr', 21) },
  { id: '10-apr-2026', label: '10 Apr 2026', photos: makePhotos('10apr', 15) },
  { id: 'mar-2026', label: 'March 2026', photos: makePhotos('mar', 30) },
  { id: 'feb-2026', label: 'February 2026', photos: makePhotos('feb', 27) },
];

const MOCK_GROUP_WITH_PHOTOS: PhotoDateGroup = MOCK_MULTI_DATE_GROUPS[0];

export { MOCK_GROUP, MOCK_GROUP_BACKING_UP, MOCK_GROUP_WITH_PHOTOS, MOCK_MULTI_DATE_GROUPS };
