import { ArrowRightIcon, CheckIcon, XIcon } from 'phosphor-react-native';
import { ActivityIndicator, Platform, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated';
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
const SENT_ICON_SIZE = 18;
const DISABLED_SEND_OPACITY = 0.35;
const HEADER_BOTTOM_PADDING = 10;
const SEND_BUTTON_RESIZE_DURATION = 250;
const SEND_LABEL_FADE_DURATION = 120;
const SENT_ICON_DAMPING = 9;

export type SendPhase = 'idle' | 'sending' | 'sent';

type ComposeHeaderProps = {
  title: string;
  canSend: boolean;
  sendPhase: SendPhase;
  onClose: () => void;
  onSend: () => void;
};

export const ComposeHeader = ({ title, canSend, sendPhase, onClose, onSend }: ComposeHeaderProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const isIdle = sendPhase === 'idle';
  const sendButtonLabels: Record<SendPhase, string> = {
    idle: strings.buttons.send,
    sending: strings.screens.compose_email.sending,
    sent: strings.screens.compose_email.sentNotice.title,
  };

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
          <Animated.View
            layout={LinearTransition.duration(SEND_BUTTON_RESIZE_DURATION)}
            style={[
              tailwind('rounded-full items-center justify-center overflow-hidden'),
              {
                backgroundColor: getColor('text-primary'),
                opacity: canSend || !isIdle ? 1 : DISABLED_SEND_OPACITY,
              },
            ]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={sendButtonLabels[sendPhase]}
              accessibilityState={{ disabled: !canSend || !isIdle, busy: sendPhase === 'sending' }}
              disabled={!canSend || !isIdle}
              onPress={onSend}
              style={[
                tailwind('flex-row items-center justify-center'),
                isIdle ? tailwind('pl-4 pr-3.5') : { width: SEND_BUTTON_HEIGHT },
                { height: SEND_BUTTON_HEIGHT },
              ]}
            >
              {isIdle && (
                <Animated.View
                  entering={FadeIn.duration(SEND_LABEL_FADE_DURATION)}
                  exiting={FadeOut.duration(SEND_LABEL_FADE_DURATION)}
                  style={tailwind('flex-row items-center')}
                >
                  <AppText semibold style={[tailwind('text-base mr-1.5'), { color: getColor('text-white') }]}>
                    {strings.buttons.send}
                  </AppText>
                  <ArrowRightIcon size={SEND_ICON_SIZE} weight="bold" color={getColor('text-white')} />
                </Animated.View>
              )}
              {sendPhase === 'sending' && (
                <Animated.View entering={FadeIn.duration(SEND_LABEL_FADE_DURATION)}>
                  <ActivityIndicator size="small" color={getColor('text-white')} />
                </Animated.View>
              )}
              {sendPhase === 'sent' && (
                <Animated.View entering={ZoomIn.springify().damping(SENT_ICON_DAMPING)}>
                  <CheckIcon size={SENT_ICON_SIZE} weight="bold" color={getColor('text-white')} />
                </Animated.View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};
