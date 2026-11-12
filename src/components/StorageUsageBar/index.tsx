import prettysize from 'prettysize';
import { useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { getLineHeight } from 'src/styles/global';
import AppText from '../AppText';
import DashedLine from '../../../assets/icons/dashed-line.svg';
import { cssInterop } from 'nativewind';
interface StorageUsageBarProps {
  style?: StyleProp<ViewStyle>;
  className?: string;
  usageBytes: number;
  limitBytes: number;
  selectedStorageBytes: number;
}

const WHITE_SPACER_WIDTH = 9;
const StorageUsageBar = (props: StorageUsageBarProps) => {
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  const getSelectedStorageWidth = () => {
    const percentage = props.selectedStorageBytes / props.usageBytes;

    return progressBarWidth * percentage;
  };

  const getCurrentUsageWidth = () => {
    return progressBarWidth - getSelectedStorageWidth();
  };
  return (
    <View
      className="bg-white h-4 border flex flex-row border-red/15 mt-6"
      style={{
        borderRadius: 4,
      }}
      onLayout={(e) => {
        setProgressBarWidth(e.nativeEvent.layout.width - WHITE_SPACER_WIDTH);
      }}
    >
      {/* Selected storage limit */}
      <View
        className="h-full bg-red/15"
        style={{
          borderTopLeftRadius: 3,
          borderBottomLeftRadius: 3,
          width: getSelectedStorageWidth(),
        }}
      ></View>
      <View className="h-full bg-white" style={{ width: WHITE_SPACER_WIDTH }}>
        <View className="absolute w-20" style={{ top: -24 }}>
          <AppText medium className="text-sm absolute ml-3 mt-1" style={{ lineHeight: getLineHeight(14, 1) }}>
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
        className="h-full bg-red"
        style={{
          borderTopRightRadius: 4,
          borderBottomRightRadius: 4,
          width: getCurrentUsageWidth(),
        }}
      ></View>
    </View>
  );
};

cssInterop(StorageUsageBar, { className: 'style' });

export default StorageUsageBar;
