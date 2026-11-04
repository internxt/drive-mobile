import { CheckIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../assets/lang/strings';
import { applyOpacity } from '../../helpers/colors';
import useGetColor from '../../hooks/useColor';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import AppText from '../AppText';
import {
  FLOATING_BUTTON_MARGIN,
  SENT_MESSAGE_NOTICE_HEIGHT,
  TAB_BAR_HEIGHT,
} from '../FloatingActionButton/floatingButtonLayout';

const NOTICE_DURATION = 5000;
const SLIDE_DURATION = 250;
const CHECK_CIRCLE_SIZE = 28;
const CHECK_ICON_SIZE = 16;
const CHECK_SPRING_DAMPING = 9;
const RECIPIENTS_TEXT_OPACITY = 0.7;
const COUNTDOWN_BAR_HEIGHT = 2;
const COUNTDOWN_TRACK_OPACITY = 0.2;
const SHADOW = '0px 6px 20px rgba(0, 0, 0, 0.25)';

export const SentMessageSnackbar = (): JSX.Element | null => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const safeAreaInsets = useSafeAreaInsets();
  const notice = useAppSelector((state) => state.ui.sentMessageNotice);
  const isTabBarHidden = useAppSelector((state) => state.ui.isTabBarHidden);
  const countdownProgress = useSharedValue(1);
  useLanguage();

  const noticeRevision = notice?.revision;

  useEffect(() => {
    if (noticeRevision === undefined) {
      return;
    }
    countdownProgress.value = 1;
    countdownProgress.value = withTiming(0, { duration: NOTICE_DURATION, easing: Easing.linear });
    const hideTimeout = setTimeout(() => dispatch(uiActions.hideSentMessageNotice()), NOTICE_DURATION);
    return () => clearTimeout(hideTimeout);
  }, [noticeRevision, countdownProgress, dispatch]);

  const countdownStyle = useAnimatedStyle(() => ({ width: `${countdownProgress.value * 100}%` }));

  if (!notice) {
    return null;
  }

  const bottomOffset = (isTabBarHidden ? 0 : TAB_BAR_HEIGHT) + FLOATING_BUTTON_MARGIN + safeAreaInsets.bottom;
  const textColor = getColor('text-surface');

  return (
    <Animated.View
      key={notice.revision}
      entering={FadeInDown.duration(SLIDE_DURATION)}
      exiting={FadeOutDown.duration(SLIDE_DURATION)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.container, { bottom: bottomOffset, backgroundColor: getColor('bg-highlight'), boxShadow: SHADOW }]}
    >
      <View style={tailwind('flex-1 flex-row items-center px-4')}>
        <Animated.View
          entering={ZoomIn.springify().damping(CHECK_SPRING_DAMPING)}
          style={[styles.checkCircle, { backgroundColor: getColor('text-green') }]}
        >
          <CheckIcon size={CHECK_ICON_SIZE} weight="bold" color={getColor('text-white')} />
        </Animated.View>
        <View style={tailwind('flex-1 ml-3')}>
          <AppText semibold numberOfLines={1} style={[tailwind('text-base'), { color: textColor }]}>
            {strings.screens.compose_email.sentNotice.title}
          </AppText>
          <AppText
            numberOfLines={1}
            style={[tailwind('text-sm'), { color: applyOpacity(textColor, RECIPIENTS_TEXT_OPACITY) }]}
          >
            {strings.formatString(strings.screens.compose_email.sentNotice.recipients, notice.recipientsLabel)}
          </AppText>
        </View>
      </View>
      <View style={[styles.countdownTrack, { backgroundColor: applyOpacity(textColor, COUNTDOWN_TRACK_OPACITY) }]}>
        <Animated.View style={[styles.countdownBar, { backgroundColor: textColor }, countdownStyle]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: FLOATING_BUTTON_MARGIN,
    right: FLOATING_BUTTON_MARGIN,
    height: SENT_MESSAGE_NOTICE_HEIGHT,
    borderRadius: SENT_MESSAGE_NOTICE_HEIGHT / 2,
    overflow: 'hidden',
  },
  checkCircle: {
    width: CHECK_CIRCLE_SIZE,
    height: CHECK_CIRCLE_SIZE,
    borderRadius: CHECK_CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: COUNTDOWN_BAR_HEIGHT,
  },
  countdownBar: {
    height: COUNTDOWN_BAR_HEIGHT,
  },
});
