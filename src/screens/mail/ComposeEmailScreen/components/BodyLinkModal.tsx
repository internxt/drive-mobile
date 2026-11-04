import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, TouchableWithoutFeedback, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

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
  const tailwind = useTailwind();
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
          style={[tailwind('flex-1 justify-center px-4'), { backgroundColor: MODAL_BACKDROP_COLOR }]}
        >
          <TouchableWithoutFeedback>
            <View style={[tailwind('p-4 rounded-xl'), { backgroundColor: getColor('bg-surface') }]}>
              <AppText style={[tailwind('text-xl mb-6'), { color: getColor('text-gray-100') }]} medium>
                {linkModal.title}
              </AppText>

              <AppTextInput
                containerStyle={tailwind('mb-8')}
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

              <View style={tailwind('flex-row')}>
                <AppButton
                  title={strings.buttons.cancel}
                  type="cancel"
                  onPress={() => closeWith(onCancel)}
                  style={tailwind('flex-1 mr-2')}
                />
                <AppButton
                  title={linkModal.confirm}
                  type="accept"
                  disabled={!linkUrl}
                  onPress={() => closeWith(() => onConfirm(linkUrl))}
                  style={tailwind('flex-1')}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
