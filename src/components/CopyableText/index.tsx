import { setStringAsync } from 'expo-clipboard';
import { Copy } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import useGetColor from 'src/hooks/useColor';
import AppText from '../AppText';

interface CopyableTextProps {
  children: string;
}

const CopyableText = (props: CopyableTextProps) => {
  const getColor = useGetColor();
  const onPress = async () => {
    await setStringAsync(props.children);
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View className="items-center rounded-md flex-row" style={{ backgroundColor: getColor('bg-gray-5') }}>
        <AppText numberOfLines={1} className="flex-1 ml-4">
          {props.children}
        </AppText>
        <View className="px-4 py-2.5">
          <Copy color={getColor('text-gray-60')} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CopyableText;
