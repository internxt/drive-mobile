import prettysize from 'prettysize';
import { useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { getLineHeight } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';
import AppText from '../AppText';
import DashedLine from '../../../assets/icons/dashed-line.svg';
interface StorageUsageBarProps {
  style?: StyleProp<ViewStyle>;
  usageBytes: number;
  limitBytes: number;
  selectedStorageBytes: number;
}

const WHITE_SPACER_WIDTH = 9;
const StorageUsageBar = (props: StorageUsageBarProps) => {
  const tailwind = useTailwind();
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  const getSelectedStorageWidth = () => {
    const percentage = props.selectedStorageBytes / props.usageBytes;

    return progressBarWidth * percentage;
  };

  const getCurrentUsageWidth = () => {
    const percentage = props.usageBytes / props.usageBytes;

    return progressBarWidth * percentage - getSelectedStorageWidth();
  };
  return (
    <View
      style={[
        tailwind('bg-white h-4 border flex flex-row border-red-light mt-6'),
        {
          borderRadius: 4,
        },
      ]}
      onLayout={(e) => {
        setProgressBarWidth(e.nativeEvent.layout.width - WHITE_SPACER_WIDTH);
      }}
    >
      {/* Selected storage limit */}
      <View
        style={[
          tailwind('h-full bg-red-light'),
          {
            borderTopLeftRadius: 3,
            borderBottomLeftRadius: 3,
            width: getSelectedStorageWidth(),
          },
        ]}
      ></View>
      <View style={[tailwind('h-full bg-white'), { width: WHITE_SPACER_WIDTH }]}>
        <View style={[tailwind('absolute w-20'), { top: -24 }]}>
          <AppText medium style={[tailwind('text-sm absolute ml-3 mt-1'), { lineHeight: getLineHeight(14, 1) }]}>
            {prettysize(props.selectedStorageBytes)}
          </AppText>
          <View
            style={{
              marginLeft: 3,
              marginTop: 5,
            }}
          >
            <DashedLine height={36} />
          </View>
        </View>
      </View>
      <View
        style={[
          tailwind('h-full bg-red-'),
          {
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
            width: getCurrentUsageWidth(),
          },
        ]}
      ></View>
    </View>
  );
};

export default StorageUsageBar;
