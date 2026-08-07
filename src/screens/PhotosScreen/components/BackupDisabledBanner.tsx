import { WarningIcon } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import strings from '../../../../assets/lang/strings';

interface BackupDisabledBannerProps {
  onEnablePress?: () => void;
}

const BackupDisabledBanner = ({ onEnablePress }: BackupDisabledBannerProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View style={[tailwind('flex-row items-start px-4 py-3'), { gap: 8, backgroundColor: getColor('bg-yellow-10') }]}>
      <WarningIcon size={16} color={getColor('text-yellow-text')} weight="fill" />
      <TouchableOpacity onPress={onEnablePress} style={tailwind('flex-1')} activeOpacity={0.7}>
        <AppText style={[tailwind('text-xs'), { color: getColor('text-yellow-text'), lineHeight: 14.4 }]}>
          {strings.screens.photos.backupDisabled.message}
          <AppText medium style={[tailwind('text-xs'), { color: getColor('text-yellow-text'), lineHeight: 14.4 }]}>
            {strings.screens.photos.backupDisabled.enableCta}
          </AppText>
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

export default BackupDisabledBanner;
