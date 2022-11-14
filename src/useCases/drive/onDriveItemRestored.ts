import drive from '@internxt-mobile/services/drive';
import { DriveEventKey } from '@internxt-mobile/types/drive';
export const onDriveItemRestored = (callback: () => void) => {
  drive.events.addListener({
    event: DriveEventKey.DriveItemRestored,
    listener: callback,
  });

  return () => {
    drive.events.removeListener({
      event: DriveEventKey.DriveItemRestored,
      listener: callback,
    });
  };
};
