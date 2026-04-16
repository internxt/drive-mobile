import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';

interface PhotosHeaderProps {
  onSelectPress?: () => void;
}

const PhotosHeader = ({ onSelectPress }: PhotosHeaderProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View
      style={[
        tailwind('pt-4'),
        styles.border,
        { backgroundColor: getColor('bg-surface'), borderBottomColor: getColor('border-gray-10') },
      ]}
    >
      <View style={tailwind('flex-row items-center h-11')}>
        <View style={tailwind('flex-1 px-4 justify-center')}>
          <AppText medium style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}>
            {strings.screens.photos.title}
          </AppText>
        </View>
        <TouchableOpacity
          onPress={onSelectPress}
          style={tailwind('px-5 py-2.5 mr-1')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppText medium style={[tailwind('text-base'), { color: getColor('text-primary') }]}>
            {strings.screens.photos.select}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default PhotosHeader;
