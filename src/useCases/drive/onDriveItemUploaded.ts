import drive from '@internxt-mobile/services/drive';
import { DriveEventKey } from '@internxt-mobile/types/drive/events';
export const onDriveItemUploaded = (callback: () => void) => {
  drive.events.addListener({
    event: DriveEventKey.UploadCompleted,
    listener: callback,
  });

  return () => {
    drive.events.removeListener({
      event: DriveEventKey.UploadCompleted,
      listener: callback,
    });
  };
};
