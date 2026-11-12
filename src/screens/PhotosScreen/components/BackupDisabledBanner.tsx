import { WarningIcon } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import strings from '../../../../assets/lang/strings';

interface BackupDisabledBannerProps {
  onEnablePress?: () => void;
}

const BackupDisabledBanner = ({ onEnablePress }: BackupDisabledBannerProps): JSX.Element => {
  const getColor = useGetColor();

  return (
    <View className="flex-row items-start px-4 py-3" style={{ gap: 8, backgroundColor: getColor('bg-yellow-10') }}>
      <WarningIcon size={16} color={getColor('text-yellow-text')} weight="fill" />
      <TouchableOpacity onPress={onEnablePress} className="flex-1" activeOpacity={0.7}>
        <AppText className="text-xs" style={{ color: getColor('text-yellow-text'), lineHeight: 14.4 }}>
          {strings.screens.photos.backupDisabled.message}
          <AppText medium className="text-xs" style={{ color: getColor('text-yellow-text'), lineHeight: 14.4 }}>
            {strings.screens.photos.backupDisabled.enableCta}
          </AppText>
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

export default BackupDisabledBanner;
