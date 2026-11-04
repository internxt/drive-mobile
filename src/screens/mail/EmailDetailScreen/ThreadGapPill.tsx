import { CaretUpDownIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';

const GAP_ROW_HEIGHT = 40;
const PILL_HEIGHT = 28;
const PILL_HORIZONTAL_PADDING = 12;
const CARET_SIZE = 12;

export const ThreadGapPill = ({ hiddenMessageCount, onPress }: { hiddenMessageCount: number; onPress: () => void }) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const label = strings.formatString(strings.screens.email_detail.moreMessages, hiddenMessageCount) as string;

  return (
    <View style={[tailwind('items-center justify-center'), { height: GAP_ROW_HEIGHT }]}>
      <View
        style={[
          tailwind('absolute'),
          { left: 0, right: 0, top: GAP_ROW_HEIGHT / 2, height: 1, backgroundColor: getColor('border-gray-10') },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          tailwind('flex-row items-center rounded-full'),
          {
            height: PILL_HEIGHT,
            paddingHorizontal: PILL_HORIZONTAL_PADDING,
            borderWidth: 1,
            borderColor: getColor('border-gray-10'),
            backgroundColor: pressed ? getColor('bg-primary-10') : getColor('bg-surface'),
          },
        ]}
      >
        <CaretUpDownIcon size={CARET_SIZE} weight="bold" color={getColor('text-primary')} />
        <AppText medium style={[tailwind('ml-1.5 text-xs'), { color: getColor('text-primary') }]}>
          {label}
        </AppText>
      </Pressable>
    </View>
  );
};
