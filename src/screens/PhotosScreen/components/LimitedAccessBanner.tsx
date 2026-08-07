import { ImageIcon } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';

interface LimitedAccessBannerProps {
  onSelectMorePress: () => void;
}

const LimitedAccessBanner = ({ onSelectMorePress }: LimitedAccessBannerProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View style={[tailwind('flex-row items-start px-4 py-3'), { gap: 8, backgroundColor: getColor('bg-primary-10') }]}>
      <ImageIcon size={16} color={getColor('text-primary')} weight="fill" />
      <TouchableOpacity onPress={onSelectMorePress} style={tailwind('flex-1')} activeOpacity={0.7}>
        <AppText style={[tailwind('text-xs'), { color: getColor('text-primary-dark'), lineHeight: 14.4 }]}>
          {strings.screens.photos.limitedAccess.message}
          <AppText medium style={[tailwind('text-xs'), { color: getColor('text-primary-dark'), lineHeight: 14.4 }]}>
            {strings.screens.photos.limitedAccess.selectMoreCta}
          </AppText>
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

export default LimitedAccessBanner;
