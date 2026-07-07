import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { PhotoDeviceOption } from '../hooks/usePhotoDevices';
import DeviceFilterDropdown from './DeviceFilterDropdown';

interface PhotosHeaderProps {
  isSelectMode?: boolean;
  onSelectPress?: () => void;
  onCancelPress?: () => void;
  activeDeviceName?: string | null;
  devices?: PhotoDeviceOption[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (deviceId: string | null) => void;
  onOpenDeviceFilter?: () => void;
}

const PhotosHeader = ({
  isSelectMode,
  onSelectPress,
  onCancelPress,
  activeDeviceName,
  devices,
  selectedDeviceId,
  onSelectDevice,
  onOpenDeviceFilter,
}: PhotosHeaderProps): JSX.Element => {
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
        <View style={tailwind('px-4 justify-center')}>
          <AppText medium style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}>
            {strings.screens.photos.title}
          </AppText>
        </View>
        <View style={styles.spacer} />
        {!isSelectMode && onSelectDevice && (
          <DeviceFilterDropdown
            activeDeviceName={activeDeviceName ?? null}
            devices={devices ?? []}
            selectedDeviceId={selectedDeviceId ?? null}
            onSelect={onSelectDevice}
            onOpen={onOpenDeviceFilter}
          />
        )}
        <TouchableOpacity
          onPress={isSelectMode ? onCancelPress : onSelectPress}
          style={tailwind('p-5 pl-3 py-2.5 mr-1 ml-2')}
        >
          <AppText medium style={[tailwind('text-base'), { color: getColor('text-primary') }]}>
            {isSelectMode ? strings.screens.photos.selection.cancel : strings.screens.photos.select}
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
  spacer: {
    flex: 1,
  },
});

export default PhotosHeader;
