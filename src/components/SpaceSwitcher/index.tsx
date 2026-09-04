import { EnvelopeIcon, FolderSimpleIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppSelector } from '../../store/hooks';
import { ActiveSpace } from '../../store/slices/ui';
import globalStyle from '../../styles/global';

const PADDING = 4;
const SLIDE_DURATION = 150;

const PILL_AT_DRIVE = 0;
const PILL_AT_MAIL = 1;

const pillPositionFor = (space: ActiveSpace) => (space === 'mail' ? PILL_AT_MAIL : PILL_AT_DRIVE);

const NO_OFFSET = 0;

interface SpaceSwitcherProps {
  onSelectSpace: (space: ActiveSpace) => void;
}

/** Segmented control that switches between the Drive and Mail spaces. */
const SpaceSwitcher = ({ onSelectSpace }: SpaceSwitcherProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const activeSpace = useAppSelector((state) => state.ui.activeSpace);
  useLanguage();

  const [width, setWidth] = useState(0);
  const pillPosition = useRef(new Animated.Value(pillPositionFor(activeSpace))).current;
  const slidingTo = useRef(pillPositionFor(activeSpace));
  const optionWidth = (width - PADDING * 2) / 2;

  const slidePillTo = useCallback(
    (space: ActiveSpace) => {
      const toValue = pillPositionFor(space);
      if (slidingTo.current === toValue) {
        return;
      }
      slidingTo.current = toValue;
      Animated.timing(pillPosition, {
        toValue,
        duration: SLIDE_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [pillPosition],
  );

  useEffect(() => {
    slidePillTo(activeSpace);
  }, [activeSpace, slidePillTo]);

  const renderOption = (space: ActiveSpace) => {
    const isActive = activeSpace === space;
    const Icon = space === 'drive' ? FolderSimpleIcon : EnvelopeIcon;
    const label = space === 'drive' ? strings.tabs.Drive : strings.tabs.Mail;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={isActive ? { selected: true } : {}}
        style={tailwind('flex-1 flex-row items-center justify-center rounded-full py-2')}
        onPress={() => {
          slidePillTo(space);
          onSelectSpace(space);
        }}
      >
        <Icon
          weight={isActive ? 'fill' : undefined}
          color={isActive ? getColor('text-primary') : getColor('text-gray-50')}
          size={18}
        />
        <Text
          style={[
            tailwind('ml-2 text-sm'),
            { color: isActive ? getColor('text-primary') : getColor('text-gray-50') },
            isActive ? globalStyle.fontWeight.medium : globalStyle.fontWeight.regular,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={tailwind('px-4 pt-2 pb-1')}>
      <View
        style={[tailwind('flex-row rounded-full'), { padding: PADDING, backgroundColor: getColor('bg-gray-5') }]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              tailwind('absolute rounded-full'),
              {
                top: PADDING,
                bottom: PADDING,
                left: PADDING,
                width: optionWidth,
                backgroundColor: getColor('bg-surface'),
                shadowColor: getColor('text-gray-100'),
                shadowOpacity: 0.08,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
                transform: [
                  {
                    translateX: pillPosition.interpolate({
                      inputRange: [PILL_AT_DRIVE, PILL_AT_MAIL],
                      outputRange: [NO_OFFSET, optionWidth],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        {renderOption('drive')}
        {renderOption('mail')}
      </View>
    </View>
  );
};

export default SpaceSwitcher;
