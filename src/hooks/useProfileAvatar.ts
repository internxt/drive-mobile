import { useEffect, useState } from 'react';
import { imageService, PROFILE_PICTURE_CACHE_KEY } from '@internxt-mobile/services/common';
import errorService from '@internxt-mobile/services/ErrorService';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { useAppSelector } from '../store/hooks';

export const useProfileAvatar = (): string | undefined => {
  const { user } = useAppSelector((state) => state.auth);
  const [profileAvatar, setProfileAvatar] = useState<string>();

  useEffect(() => {
    if (!user?.avatar) {
      return setProfileAvatar(undefined);
    }

    imageService
      .getCachedImage(PROFILE_PICTURE_CACHE_KEY)
      .then((cachedImage) => {
        if (!user.avatar) return;
        if (cachedImage) {
          setProfileAvatar(fs.pathToUri(cachedImage));
        } else {
          setProfileAvatar(user.avatar);
        }
      })
      .catch((err) => {
        errorService.reportError(err);
        if (user?.avatar) {
          setProfileAvatar(user.avatar);
        }
      });
  }, [user?.avatar]);

  return profileAvatar;
};
