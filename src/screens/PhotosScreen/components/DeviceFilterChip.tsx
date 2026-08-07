import { CaretDownIcon, FunnelSimpleIcon, XIcon } from 'phosphor-react-native';
import FilterChip from 'src/components/FilterChip';

interface DeviceFilterChipProps {
  activeDeviceName: string | null;
  isMenuOpen?: boolean;
  onOpen: () => void;
  onClear: () => void;
}

const DEVICE_NAME_MAX_WIDTH = 162;

const DeviceFilterChip = ({ activeDeviceName, isMenuOpen, onOpen, onClear }: DeviceFilterChipProps): JSX.Element => {
  if (!activeDeviceName) {
    return <FilterChip icon={FunnelSimpleIcon} onPress={onOpen} active={isMenuOpen} />;
  }

  return (
    <FilterChip
      icon={XIcon}
      trailingIcon={CaretDownIcon}
      label={activeDeviceName}
      labelMaxWidth={DEVICE_NAME_MAX_WIDTH}
      onIconPress={onClear}
      onPress={onOpen}
      active={isMenuOpen}
    />
  );
};

export default DeviceFilterChip;
