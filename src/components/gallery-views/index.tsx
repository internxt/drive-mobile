import { GalleryViewMode } from '../../types/photos';
import GalleryAllView from './GalleryAllView';
import GalleryDaysView from './GalleryDaysView';
import GalleryMonthsView from './GalleryMonthsView';
import GalleryYearsView from './GalleryYearsView';

export default {
  [GalleryViewMode.All]: GalleryAllView,
  [GalleryViewMode.Days]: GalleryDaysView,
  [GalleryViewMode.Months]: GalleryMonthsView,
  [GalleryViewMode.Years]: GalleryYearsView,
};
