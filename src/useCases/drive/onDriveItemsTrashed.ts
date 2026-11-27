import drive from '@internxt-mobile/services/drive';
import { DriveEventKey } from '@internxt-mobile/types/drive/events';

export const onDriveItemsTrashed = (callback: (trashResult: { trashedUuids: string[] }) => void) => {
  drive.events.addListener({
    event: DriveEventKey.DriveItemsTrashed,
    listener: callback,
  });

  return () => {
    drive.events.removeListener({
      event: DriveEventKey.DriveItemsTrashed,
      listener: callback,
    });
  };
};
