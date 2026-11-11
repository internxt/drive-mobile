import drive from '@internxt-mobile/services/drive';
import { DriveEventKey } from '@internxt-mobile/types/drive/events';
import { MoveDriveItemsResult } from './move';

export const onDriveItemMoved = (callback: (moveResult: MoveDriveItemsResult) => void) => {
  drive.events.addListener({
    event: DriveEventKey.DriveItemMoved,
    listener: callback,
  });

  return () => {
    drive.events.removeListener({
      event: DriveEventKey.DriveItemMoved,
      listener: callback,
    });
  };
};
