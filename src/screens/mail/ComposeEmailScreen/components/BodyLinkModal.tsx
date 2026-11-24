import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, TouchableWithoutFeedback, View } from 'react-native';

import strings from '../../../../../assets/lang/strings';
import AppButton from '../../../../components/AppButton';
import AppText from '../../../../components/AppText';
import AppTextInput from '../../../../components/AppTextInput';
import useGetColor from '../../../../hooks/useColor';
import { completeLinkUrl } from '../utils/composeBodyHtml';

const MODAL_BACKDROP_COLOR = 'rgba(0, 0, 0, 0.7)';

type BodyLinkModalProps = {
  isOpen: boolean;
  onConfirm: (url: string) => void;
  onCancel: () => void;
};

export const BodyLinkModal = ({ isOpen, onConfirm, onCancel }: BodyLinkModalProps): JSX.Element => {
  const getColor = useGetColor();
  const [typedUrl, setTypedUrl] = useState('');
  const { linkModal } = strings.screens.compose_email;
  const linkUrl = completeLinkUrl(typedUrl);

  const closeWith = (onClose: () => void) => {
    setTypedUrl('');
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => closeWith(onCancel)}>
      <TouchableWithoutFeedback onPress={() => closeWith(onCancel)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center px-4"
          style={{ backgroundColor: MODAL_BACKDROP_COLOR }}
        >
          <TouchableWithoutFeedback>
            <View className="p-4 rounded-xl" style={{ backgroundColor: getColor('bg-surface') }}>
              <AppText className="text-xl mb-6" style={{ color: getColor('text-gray-100') }} medium>
                {linkModal.title}
              </AppText>

              <AppTextInput
                containerClassName="mb-8"
                label={linkModal.address}
                value={typedUrl}
                onChangeText={setTypedUrl}
                placeholder={linkModal.addressPlaceholder}
                keyboardType="url"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                autoFocus
              />

              <View className="flex-row">
                <AppButton
                  title={strings.buttons.cancel}
                  type="cancel"
                  onPress={() => closeWith(onCancel)}
                  className="flex-1 mr-2"
                />
                <AppButton
                  title={linkModal.confirm}
                  type="accept"
                  disabled={!linkUrl}
                  onPress={() => closeWith(() => onConfirm(linkUrl))}
                  className="flex-1"
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
