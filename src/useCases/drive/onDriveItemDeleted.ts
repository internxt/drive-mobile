import drive from '@internxt-mobile/services/drive';
import { DriveEventKey } from '@internxt-mobile/types/drive';
export const onDriveItemDeleted = (callback: () => void) => {
  drive.events.addListener({
    event: DriveEventKey.DriveItemDeleted,
    listener: callback,
  });

  return () => {
    drive.events.removeListener({
      event: DriveEventKey.DriveItemDeleted,
      listener: callback,
    });
  };
};
