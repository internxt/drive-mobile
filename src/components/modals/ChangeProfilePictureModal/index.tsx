import errorService from '@internxt-mobile/services/ErrorService';
import {
  ImagePickerOptions,
  ImagePickerResult,
  launchCameraAsync,
  launchImageLibraryAsync,
  MediaTypeOptions,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker';
import { Camera, ImageSquare, Trash } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { imageService } from '../../../services/common/media/image.service';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { authThunks } from '../../../store/slices/auth';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import UserProfilePicture from '../../UserProfilePicture';
import BottomModal from '../BottomModal';

const ChangeProfilePictureModal = (props: BaseModalProps) => {
  const dispatch = useAppDispatch();
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { user } = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined | null>(user?.avatar);
  const hasAvatar = !!avatar;
  const isDirty = avatar !== user?.avatar;
  const resizeAndSetUri = async (uri: string) => {
    const size = 512;
    const response = await imageService.resize({
      uri: uri,
      width: size,
      format: 'JPEG',
      quality: 100,
      rotation: 0,
    });

    setAvatar(response.path);
  };
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const onDeletePressed = () => {
    setAvatar(null);
  };
  const onUploadPhotoPressed = async () => {
    const response = await requestMediaLibraryPermissionsAsync();

    if (response.granted) {
      const options: ImagePickerOptions = { allowsMultipleSelection: false, mediaTypes: MediaTypeOptions.Images };
      const result: ImagePickerResult = await launchImageLibraryAsync(options);

      const asset = result.assets?.pop();
      if (!result.canceled && asset) {
        resizeAndSetUri(asset.uri);
      }
    }
  };
  const onTakePhotoPressed = async () => {
    const response = await requestCameraPermissionsAsync();

    if (response.granted) {
      const options: ImagePickerOptions = { allowsMultipleSelection: false, mediaTypes: MediaTypeOptions.Images };
      const result = await launchCameraAsync(options);
      const asset = result.assets?.pop();
      if (!result.canceled && asset) {
        resizeAndSetUri(asset.uri);
      }
    }
  };
  const onSaveButtonPressed = async () => {
    setIsLoading(true);
    try {
      if (avatar) {
        await dispatch(
          authThunks.changeProfilePictureThunk({ uri: avatar, name: `${Date.now().toString()}.jpeg` }),
        ).unwrap();
      } else {
        await dispatch(authThunks.deleteProfilePictureThunk()).unwrap();
      }
    } catch (err) {
      errorService.reportError(err);
    } finally {
      setIsLoading(false);
      props.onClose();
    }
  };
  const actions = [
    {
      key: 'delete',
      label: strings.buttons.delete,
      disabled: !hasAvatar || isLoading,
      iconComponent: Trash,
      onPress: onDeletePressed,
    },
    {
      key: 'upload-photo',
      label: strings.buttons.uploadPhoto,
      disabled: isLoading,
      iconComponent: ImageSquare,
      onPress: onUploadPhotoPressed,
    },
    {
      key: 'take-photo',
      label: strings.buttons.takePhoto,
      disabled: isLoading,
      iconComponent: Camera,
      onPress: onTakePhotoPressed,
    },
  ];
  const renderActions = () =>
    actions.map((action) => (
      <TouchableOpacity key={action.key} style={tailwind('flex-1')} onPress={action.onPress} disabled={action.disabled}>
        <View
          style={[
            tailwind('rounded-xl items-center py-3 mr-1'),
            {
              backgroundColor: action.disabled ? getColor('bg-gray-10') : getColor('bg-gray-5'),
              borderColor: getColor('border-gray-10'),
              borderWidth: 1,
              opacity: action.disabled ? 0.5 : 1,
            },
          ]}
        >
          <action.iconComponent
            weight="thin"
            size={40}
            color={action.disabled ? getColor('text-gray-40') : getColor('text-gray-80')}
          />
          <AppText
            style={[
              tailwind('text-xs'),
              { color: action.disabled ? getColor('text-gray-40') : getColor('text-gray-100') },
            ]}
            medium
          >
            {action.label}
          </AppText>
        </View>
      </TouchableOpacity>
    ));

  useEffect(() => {
    if (props.isOpen) {
      setAvatar(user?.avatar);
    }
  }, [props.isOpen]);

  return (
    <BottomModal
      isOpen={props.isOpen}
      onClosed={props.onClose}
      topDecoration
      backdropPressToClose={!isLoading}
      backButtonClose={!isLoading}
    >
      <View style={tailwind('px-4 pb-4')}>
        <AppText style={tailwind('text-center')} semibold>
          {strings.modals.ChangeProfilePicture.title.toUpperCase()}
        </AppText>

        <View style={tailwind('items-center my-6')}>
          <UserProfilePicture uri={avatar} size={112} />
        </View>

        <View style={tailwind('flex-row mb-6')}>{renderActions()}</View>

        <View style={tailwind('flex-row')}>
          <AppButton
            style={tailwind('flex-1 mr-1.5')}
            onPress={onCancelButtonPressed}
            title={strings.buttons.cancel}
            type="cancel"
            disabled={isLoading}
          />
          <AppButton
            style={tailwind('flex-1')}
            onPress={onSaveButtonPressed}
            title={isLoading ? strings.buttons.saving : strings.buttons.saveChanges}
            disabled={!isDirty || isLoading}
            loading={isLoading}
            type="accept"
          />
        </View>
      </View>
    </BottomModal>
  );
};

export default ChangeProfilePictureModal;
