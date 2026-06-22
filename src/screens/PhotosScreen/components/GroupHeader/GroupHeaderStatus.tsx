import {
  CheckCircleIcon,
  CloudArrowDownIcon,
  CloudSlashIcon,
  DeviceMobileIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  WifiSlashIcon,
  WarningCircleIcon,
} from 'phosphor-react-native';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../../assets/lang/strings';

const ICON_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

interface ColorProps {
  color: string;
}

interface CountProps {
  count: number;
  color: string;
}

export const GroupHeaderCount = ({ count, color }: CountProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <AppText medium style={[tailwind('text-base'), { color }]}>
      {count.toLocaleString()} {strings.screens.photos.groupHeader.items}
    </AppText>
  );
};

export const GroupHeaderScanning = ({ color }: ColorProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <>
      <ActivityIndicator size="small" color={color} />
      <AppText medium style={[tailwind('text-base'), { color }]}>
        {strings.screens.photos.groupHeader.scanningGallery}
      </AppText>
      <DeviceMobileIcon size={24} color={color} weight="regular" />
    </>
  );
};

export const GroupHeaderFetching = ({ color }: ColorProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <>
      <CloudArrowDownIcon size={24} color={color} weight="regular" />
      <AppText medium style={[tailwind('text-base'), { color }]}>
        {strings.screens.photos.groupHeader.gettingPhotos}
      </AppText>
    </>
  );
};

interface UploadingProps {
  count?: number;
  primaryColor: string;
  labelColor: string;
  statusColor: string;
  onPausePress?: () => void;
}

export const GroupHeaderUploading = ({
  count,
  primaryColor,
  labelColor,
  statusColor,
  onPausePress,
}: UploadingProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <>
      <ActivityIndicator size="small" color={primaryColor} />
      <AppText medium numberOfLines={1} style={[tailwind('text-base'), { color: labelColor, lineHeight: 24, flexShrink: 1 }]}>
        {strings.screens.photos.groupHeader.backingUp}
      </AppText>
      {count != null && (
        <AppText style={[tailwind('text-sm'), { color: statusColor, lineHeight: 24 }]}>
          {count.toLocaleString()} {strings.screens.photos.groupHeader.items}
        </AppText>
      )}
      <TouchableOpacity onPress={onPausePress} hitSlop={ICON_HIT_SLOP}>
        <PauseCircleIcon size={24} color={primaryColor} weight="fill" />
      </TouchableOpacity>
    </>
  );
};

export const GroupHeaderPausing = ({ color }: ColorProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <>
      <ActivityIndicator size="small" color={color} />
      <AppText medium style={[tailwind('text-base'), { color, lineHeight: 24 }]}>
        {strings.screens.photos.groupHeader.backupPausing}
      </AppText>
    </>
  );
};

interface PausedProps {
  count: number;
  primaryColor: string;
  labelColor: string;
  statusColor: string;
  onResumePress?: () => void;
}

export const GroupHeaderPaused = ({
  count,
  primaryColor,
  labelColor,
  statusColor,
  onResumePress,
}: PausedProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <>
      <AppText medium numberOfLines={1} style={[tailwind('text-base'), { color: labelColor, lineHeight: 24, flexShrink: 1 }]}>
        {strings.screens.photos.groupHeader.backupPaused}
      </AppText>
      <AppText style={[tailwind('text-sm'), { color: statusColor, lineHeight: 24 }]}>
        {count.toLocaleString()} {strings.screens.photos.groupHeader.items}
      </AppText>
      <TouchableOpacity onPress={onResumePress} hitSlop={ICON_HIT_SLOP}>
        <PlayCircleIcon size={24} color={primaryColor} weight="fill" />
      </TouchableOpacity>
    </>
  );
};

interface PausedStorageFullProps {
  dangerColor: string;
}

export const GroupHeaderPausedNoWifi = ({ color }: ColorProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText medium style={[tailwind('text-base'), { color }]}>
        {strings.screens.photos.groupHeader.waitingForWifi}
      </AppText>
      <WifiSlashIcon size={24} color={color} />
    </View>
  );
};

export const GroupHeaderPausedNoConnection = ({ color }: ColorProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText medium style={[tailwind('text-base'), { color }]}>
        {strings.screens.photos.groupHeader.noConnection}
      </AppText>
      <CloudSlashIcon size={24} color={color} />
    </View>
  );
};

export const GroupHeaderPausedStorageFull = ({ dangerColor }: PausedStorageFullProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8, flexShrink: 1 }}>
        <AppText medium style={[tailwind('text-base'), { color: dangerColor, flexShrink: 0 }]}>
          {strings.screens.photos.groupHeader.backupPaused}
        </AppText>
        <AppText style={[tailwind('text-sm'), { color: dangerColor, flexShrink: 1 }]}>
          {strings.screens.photos.groupHeader.storageFull}
        </AppText>
      </View>
      <WarningCircleIcon size={24} color={dangerColor} weight="fill" />
    </View>
  );
};

export const GroupHeaderCompleted = ({ color }: ColorProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <>
      <AppText medium style={[tailwind('text-base'), { color }]}>
        {strings.screens.photos.groupHeader.backupCompleted}
      </AppText>
      <CheckCircleIcon size={24} color={color} weight="fill" />
    </>
  );
};

interface UploadErrorProps {
  count: number;
  color: string;
  onPress?: () => void;
}

interface SelectionProps {
  count: number;
  color: string;
}

export const GroupHeaderSelection = ({ count, color }: SelectionProps): JSX.Element => {
  const tailwind = useTailwind();
  const text =
    count === 0
      ? strings.screens.photos.selection.selectItems
      : count === 1
        ? strings.screens.photos.selection.itemSelected
        : (strings.formatString(strings.screens.photos.selection.itemsSelected, count) as string);
  return (
    <AppText medium style={[tailwind('text-base'), { color }]}>
      {text}
    </AppText>
  );
};

export const GroupHeaderUploadError = ({ count, color, onPress }: UploadErrorProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <TouchableOpacity onPress={onPress} hitSlop={ICON_HIT_SLOP} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText medium style={[tailwind('text-base'), { color }]}>
        {count.toLocaleString()} {strings.screens.photos.groupHeader.withError}
      </AppText>
      <WarningCircleIcon size={24} color={color} weight="fill" />
    </TouchableOpacity>
  );
};
