import { ImageIcon, LockKeyIcon, PaperclipIcon, TrashIcon } from 'phosphor-react-native';
import { Pressable, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../../assets/lang/strings';
import AppText from '../../../../components/AppText';
import { applyOpacity } from '../../../../helpers/colors';
import useGetColor from '../../../../hooks/useColor';

const TOOLBAR_BUTTON_SIZE = 44;
const TOOLBAR_ICON_SIZE = 23;
const LOCK_ICON_SIZE = 14;
const DISABLED_OPACITY = 0.5;
const DISCARD_ICON_SIZE = 22;
const DISCARD_PRESSED_BACKGROUND_OPACITY = 0.1;

type ComposeToolbarProps = {
  disabled: boolean;
  isMessageEndToEndEncrypted: boolean;
  canDiscardDraft: boolean;
  onAddFiles: () => void;
  onAddPhotos: () => void;
  onDiscardDraft: () => void;
};

export const ComposeToolbar = ({
  disabled,
  isMessageEndToEndEncrypted,
  canDiscardDraft,
  onAddFiles,
  onAddPhotos,
  onDiscardDraft,
}: ComposeToolbarProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { attachments } = strings.screens.compose_email;

  const renderToolbarButton = (label: string, Icon: typeof PaperclipIcon, onPress: () => void) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        tailwind('items-center justify-center rounded-xl'),
        { width: TOOLBAR_BUTTON_SIZE, height: TOOLBAR_BUTTON_SIZE, opacity: disabled ? DISABLED_OPACITY : 1 },
      ]}
    >
      <Icon size={TOOLBAR_ICON_SIZE} color={getColor('text-gray-80')} />
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        tailwind('flex-row items-center px-2.5 py-1.5'),
        { borderTopWidth: 1, borderTopColor: getColor('border-gray-10') },
      ]}
    >
      {renderToolbarButton(attachments.addFiles, PaperclipIcon, onAddFiles)}
      {renderToolbarButton(attachments.addPhotos, ImageIcon, onAddPhotos)}
      <View style={tailwind('flex-1')} />
      {isMessageEndToEndEncrypted && (
        <View style={tailwind('flex-row items-center px-2')}>
          <LockKeyIcon size={LOCK_ICON_SIZE} color={getColor('text-gray-50')} />
          <AppText style={[tailwind('ml-1.5 text-sm'), { color: getColor('text-gray-50') }]}>
            {strings.screens.compose_email.endToEndEncrypted}
          </AppText>
        </View>
      )}
      {canDiscardDraft && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.screens.compose_email.draft.discard}
          onPress={onDiscardDraft}
          style={({ pressed }) => [
            tailwind('items-center justify-center rounded-xl'),
            {
              width: TOOLBAR_BUTTON_SIZE,
              height: TOOLBAR_BUTTON_SIZE,
              backgroundColor: pressed
                ? applyOpacity(getColor('text-red'), DISCARD_PRESSED_BACKGROUND_OPACITY)
                : undefined,
            },
          ]}
        >
          <TrashIcon size={DISCARD_ICON_SIZE} color={getColor('text-gray-50')} />
        </Pressable>
      )}
    </View>
  );
};
