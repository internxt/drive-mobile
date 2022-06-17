import { Camera, ImageSquare, Trash } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { useAppSelector } from '../../../store/hooks';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import UserProfilePicture from '../../UserProfilePicture';
import BottomModal from '../BottomModal';

const ChangeProfilePictureModal = (props: BaseModalProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { user } = useAppSelector((state) => state.auth);
  const [avatar, setAvatar] = useState<string | undefined | null>(user?.avatar);
  const hasAvatar = !!avatar;
  const isDirty = avatar !== user?.avatar;
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const onSaveButtonPressed = () => {
    // TODO
  };
  const onDeletePressed = () => {
    setAvatar(null);
  };
  const onUploadPhotoPressed = () => undefined;
  const onTakePhotoPressed = () => undefined;
  const actions = [
    {
      key: 'delete',
      label: strings.buttons.delete,
      disabled: !hasAvatar,
      iconComponent: Trash,
      onPress: onDeletePressed,
    },
    {
      key: 'upload-photo',
      label: strings.buttons.uploadPhoto,
      disabled: false,
      iconComponent: ImageSquare,
      onPress: onUploadPhotoPressed,
    },
    {
      key: 'take-photo',
      label: strings.buttons.takePhoto,
      disabled: false,
      iconComponent: Camera,
      onPress: onTakePhotoPressed,
    },
  ];
  const renderActions = () =>
    actions.map((action) => (
      <TouchableOpacity key={action.key} style={tailwind('flex-1')} onPress={action.onPress} disabled={action.disabled}>
        <View
          style={[
            tailwind('border border-gray-5 rounded-xl bg-gray-5 items-center py-3 mr-1'),
            action.disabled && tailwind('bg-gray-5/50'),
          ]}
        >
          <action.iconComponent
            weight="thin"
            size={40}
            color={action.disabled ? getColor('text-gray-40') : getColor('text-gray-80')}
          />
          <AppText style={[tailwind('text-xs'), action.disabled && tailwind('text-gray-40')]} medium>
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
    <BottomModal isOpen={props.isOpen} onClosed={props.onClose} topDecoration>
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
          />
          <AppButton
            style={tailwind('flex-1')}
            onPress={onSaveButtonPressed}
            title={strings.buttons.saveChanges}
            disabled={!isDirty}
            type="accept"
          />
        </View>
      </View>
    </BottomModal>
  );
};

export default ChangeProfilePictureModal;
