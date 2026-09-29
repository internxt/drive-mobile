import { ArrowRightIcon, XIcon } from 'phosphor-react-native';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../../assets/lang/strings';
import AppText from '../../../../components/AppText';
import useGetColor from '../../../../hooks/useColor';

const GRABBER_WIDTH = 36;
const GRABBER_HEIGHT = 5;
const CLOSE_BUTTON_SIZE = 34;
const CLOSE_ICON_SIZE = 16;
const SEND_BUTTON_HEIGHT = 34;
const SEND_ICON_SIZE = 15;
const DISABLED_SEND_OPACITY = 0.35;
const HEADER_BOTTOM_PADDING = 10;

type ComposeHeaderProps = {
  title: string;
  canSend: boolean;
  onClose: () => void;
  onSend: () => void;
};

export const ComposeHeader = ({ title, canSend, onClose, onSend }: ComposeHeaderProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View>
      {Platform.OS === 'ios' && (
        <View
          style={[
            tailwind('rounded-full mt-2'),
            {
              alignSelf: 'center',
              width: GRABBER_WIDTH,
              height: GRABBER_HEIGHT,
              backgroundColor: getColor('bg-gray-20'),
            },
          ]}
        />
      )}
      <View style={[tailwind('flex-row items-center px-4 pt-2'), { paddingBottom: HEADER_BOTTOM_PADDING }]}>
        <View style={tailwind('flex-1 items-start')}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={strings.screens.compose_email.close}
            onPress={onClose}
            style={[
              tailwind('items-center justify-center rounded-full'),
              { width: CLOSE_BUTTON_SIZE, height: CLOSE_BUTTON_SIZE, backgroundColor: getColor('bg-gray-5') },
            ]}
          >
            <XIcon size={CLOSE_ICON_SIZE} weight="bold" color={getColor('text-gray-80')} />
          </TouchableOpacity>
        </View>
        <AppText semibold numberOfLines={1} style={[tailwind('text-lg'), { color: getColor('text-gray-100') }]}>
          {title}
        </AppText>
        <View style={tailwind('flex-1 flex-row items-center justify-end')}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={onSend}
            style={[
              tailwind('flex-row items-center rounded-full pl-4 pr-3.5'),
              {
                height: SEND_BUTTON_HEIGHT,
                backgroundColor: getColor('text-primary'),
                opacity: canSend ? 1 : DISABLED_SEND_OPACITY,
              },
            ]}
          >
            <AppText semibold style={[tailwind('text-base mr-1.5'), { color: getColor('text-white') }]}>
              {strings.buttons.send}
            </AppText>
            <ArrowRightIcon size={SEND_ICON_SIZE} weight="bold" color={getColor('text-white')} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
