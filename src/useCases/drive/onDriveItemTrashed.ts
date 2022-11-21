import drive from '@internxt-mobile/services/drive';
import { DriveEventKey } from '@internxt-mobile/types/drive';
export const onDriveItemTrashed = (callback: () => void) => {
  drive.events.addListener({
    event: DriveEventKey.DriveItemTrashed,
    listener: callback,
  });

  return () => {
    drive.events.removeListener({
      event: DriveEventKey.DriveItemTrashed,
      listener: callback,
    });
  };
};
