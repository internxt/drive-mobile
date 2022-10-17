import { GalleryViewMode } from '../../types/photos';
import GalleryAllView from './GalleryAllView';

export default {
  [GalleryViewMode.All]: GalleryAllView,
};
