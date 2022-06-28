import { setString } from 'expo-clipboard';
import { Copy } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import AppText from '../AppText';

interface CopyableTextProps {
  children: string;
}

const CopyableText = (props: CopyableTextProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const onPress = () => {
    setString(props.children);
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={tailwind('items-center rounded-md flex-row bg-gray-5')}>
        <AppText numberOfLines={1} style={tailwind('flex-1 ml-4')}>
          {props.children}
        </AppText>
        <View style={tailwind('px-4 py-2.5')}>
          <Copy color={getColor('text-gray-60')} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CopyableText;
