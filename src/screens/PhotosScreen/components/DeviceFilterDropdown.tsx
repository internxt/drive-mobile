import { CheckIcon, DeviceMobileIcon, SquaresFourIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modal';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { PhotoDeviceOption } from '../hooks/usePhotoDevices';
import DeviceFilterChip from './DeviceFilterChip';

interface DeviceFilterDropdownProps {
  activeDeviceName: string | null;
  devices: PhotoDeviceOption[];
  selectedDeviceId: string | null;
  onSelect: (deviceId: string | null) => void;
  onOpen?: () => void;
}

interface FilterRowProps {
  icon: React.ReactElement;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

interface Anchor {
  top: number;
  right: number;
}

const CARD_WIDTH = 224;
const CARD_GAP = 8;

const FilterRow = ({ icon, label, isSelected, onPress }: FilterRowProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <TouchableOpacity onPress={onPress} style={[tailwind('flex-row items-center px-3'), styles.row]}>
      <View style={styles.rowIcon}>{icon}</View>
      <AppText numberOfLines={1} style={[tailwind('text-base flex-1'), { color: getColor('text-gray-100') }]}>
        {label}
      </AppText>
      {isSelected && <CheckIcon size={18} color={getColor('text-primary')} weight="bold" />}
    </TouchableOpacity>
  );
};

const DeviceFilterDropdown = ({
  activeDeviceName,
  devices,
  selectedDeviceId,
  onSelect,
  onOpen,
}: DeviceFilterDropdownProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const chipAnchorRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const deviceFilterStrings = strings.screens.photos.deviceFilter;
  const iconColor = getColor('text-gray-60');

  const openMenu = () => {
    onOpen?.();
    chipAnchorRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      setAnchor({ top: y + height + CARD_GAP, right: screenWidth - (x + width) });
    });
  };

  const closeMenu = () => setAnchor(null);

  const toggleMenu = () => (anchor ? closeMenu() : openMenu());

  const handleSelect = (deviceId: string | null) => {
    onSelect(deviceId);
    closeMenu();
  };

  return (
    <>
      <View ref={chipAnchorRef} collapsable={false} style={styles.chipAnchor}>
        <DeviceFilterChip
          activeDeviceName={activeDeviceName}
          isMenuOpen={anchor !== null}
          onOpen={toggleMenu}
          onClear={() => onSelect(null)}
        />
      </View>

      <Modal
        isVisible={anchor !== null}
        onBackdropPress={closeMenu}
        onBackButtonPress={closeMenu}
        backdropOpacity={0}
        style={styles.modal}
        animationIn="fadeIn"
        animationOut="fadeOut"
        animationInTiming={120}
        animationOutTiming={120}
        useNativeDriver
        useNativeDriverForBackdrop
        hideModalContentWhileAnimating
        coverScreen
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={tailwind('flex-1')}>
            {anchor && (
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.card,
                    {
                      top: anchor.top,
                      right: anchor.right,
                      backgroundColor: getColor('bg-surface'),
                      shadowColor: getColor('text-gray-100'),
                    },
                  ]}
                >
                  <AppText medium style={[tailwind('text-base px-3 pt-1 pb-2'), { color: getColor('text-gray-100') }]}>
                    {deviceFilterStrings.title}
                  </AppText>
                  <View style={[styles.separator, { backgroundColor: getColor('border-gray-10') }]} />

                  <FilterRow
                    icon={<SquaresFourIcon size={20} color={iconColor} />}
                    label={deviceFilterStrings.allDevices}
                    isSelected={selectedDeviceId == null}
                    onPress={() => handleSelect(null)}
                  />

                  {devices.length > 0 && (
                    <View style={[styles.separator, { backgroundColor: getColor('border-gray-10') }]} />
                  )}

                  {devices.map((device) => (
                    <FilterRow
                      key={device.uuid}
                      icon={<DeviceMobileIcon size={20} color={iconColor} />}
                      label={device.name}
                      isSelected={selectedDeviceId === device.uuid}
                      onPress={() => handleSelect(device.uuid)}
                    />
                  ))}
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  chipAnchor: {
    flexShrink: 1,
  },
  modal: {
    margin: 0,
    flex: 1,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    borderRadius: 12,
    paddingVertical: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  row: {
    height: 40,
  },
  rowIcon: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
});

export default DeviceFilterDropdown;
