import {
  CheckCircleIcon,
  CloudArrowDownIcon,
  CloudSlashIcon,
  DeviceMobileIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  WarningCircleIcon,
  WifiSlashIcon,
} from 'phosphor-react-native';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../../assets/lang/strings';

const ICON_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export const useGroupHeaderColors = (isSticky?: boolean) => {
  const getColor = useGetColor();
  return {
    labelColor: isSticky ? getColor('text-white') : getColor('text-gray-100'),
    statusColor: isSticky ? getColor('text-white-90') : getColor('text-gray-60'),
    primaryColor: getColor('text-primary'),
    dangerColor: getColor('text-red'),
  };
};

interface StickyProps {
  isSticky?: boolean;
}

interface CountProps extends StickyProps {
  count: number;
}

export const GroupHeaderCount = ({ count, isSticky }: CountProps): JSX.Element => {
  const tailwind = useTailwind();
  const { statusColor } = useGroupHeaderColors(isSticky);
  return (
    <AppText medium style={[tailwind('text-base'), { color: statusColor }]}>
      {count.toLocaleString()} {strings.screens.photos.groupHeader.items}
    </AppText>
  );
};

export const GroupHeaderScanning = ({ isSticky }: StickyProps): JSX.Element => {
  const tailwind = useTailwind();
  const { statusColor } = useGroupHeaderColors(isSticky);
  return (
    <>
      <ActivityIndicator size="small" color={statusColor} />
      <AppText medium style={[tailwind('text-base'), { color: statusColor }]}>
        {strings.screens.photos.groupHeader.scanningGallery}
      </AppText>
      <DeviceMobileIcon size={24} color={statusColor} weight="regular" />
    </>
  );
};

export const GroupHeaderFetching = ({ isSticky }: StickyProps): JSX.Element => {
  const tailwind = useTailwind();
  const { statusColor } = useGroupHeaderColors(isSticky);
  return (
    <>
      <CloudArrowDownIcon size={24} color={statusColor} weight="regular" />
      <AppText medium style={[tailwind('text-base'), { color: statusColor }]}>
        {strings.screens.photos.groupHeader.gettingPhotos}
      </AppText>
    </>
  );
};

interface UploadingProps extends StickyProps {
  count?: number;
  onPausePress?: () => void;
}

export const GroupHeaderUploading = ({ count, isSticky, onPausePress }: UploadingProps): JSX.Element => {
  const tailwind = useTailwind();
  const { primaryColor, labelColor, statusColor } = useGroupHeaderColors(isSticky);
  return (
    <>
      <ActivityIndicator size="small" color={primaryColor} />
      <AppText
        medium
        numberOfLines={1}
        style={[tailwind('text-base'), { color: labelColor, lineHeight: 24, flexShrink: 1 }]}
      >
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

export const GroupHeaderPausing = ({ isSticky }: StickyProps): JSX.Element => {
  const tailwind = useTailwind();
  const { labelColor } = useGroupHeaderColors(isSticky);
  return (
    <>
      <ActivityIndicator size="small" color={labelColor} />
      <AppText medium style={[tailwind('text-base'), { color: labelColor, lineHeight: 24 }]}>
        {strings.screens.photos.groupHeader.backupPausing}
      </AppText>
    </>
  );
};

interface PausedProps extends StickyProps {
  count: number;
  onResumePress?: () => void;
}

export const GroupHeaderPaused = ({ count, isSticky, onResumePress }: PausedProps): JSX.Element => {
  const tailwind = useTailwind();
  const { primaryColor, labelColor, statusColor } = useGroupHeaderColors(isSticky);
  return (
    <>
      <AppText
        medium
        numberOfLines={1}
        style={[tailwind('text-base'), { color: labelColor, lineHeight: 24, flexShrink: 1 }]}
      >
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

export const GroupHeaderPausedNoWifi = ({ isSticky }: StickyProps): JSX.Element => {
  const tailwind = useTailwind();
  const { statusColor } = useGroupHeaderColors(isSticky);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText medium style={[tailwind('text-base'), { color: statusColor }]}>
        {strings.screens.photos.groupHeader.waitingForWifi}
      </AppText>
      <WifiSlashIcon size={24} color={statusColor} />
    </View>
  );
};

export const GroupHeaderPausedNoConnection = ({ isSticky }: StickyProps): JSX.Element => {
  const tailwind = useTailwind();
  const { statusColor } = useGroupHeaderColors(isSticky);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText medium style={[tailwind('text-base'), { color: statusColor }]}>
        {strings.screens.photos.groupHeader.noConnection}
      </AppText>
      <CloudSlashIcon size={24} color={statusColor} />
    </View>
  );
};

export const GroupHeaderPausedStorageFull = (): JSX.Element => {
  const tailwind = useTailwind();
  const { dangerColor } = useGroupHeaderColors();
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

export const GroupHeaderCompleted = ({ isSticky }: StickyProps): JSX.Element => {
  const tailwind = useTailwind();
  const { labelColor } = useGroupHeaderColors(isSticky);
  return (
    <>
      <AppText medium style={[tailwind('text-base'), { color: labelColor }]}>
        {strings.screens.photos.groupHeader.backupCompleted}
      </AppText>
      <CheckCircleIcon size={24} color={labelColor} weight="fill" />
    </>
  );
};

interface UploadErrorProps extends StickyProps {
  count: number;
  onPress?: () => void;
}

interface SelectionProps extends StickyProps {
  count: number;
}

export const GroupHeaderSelection = ({ count, isSticky }: SelectionProps): JSX.Element => {
  const tailwind = useTailwind();
  const { labelColor } = useGroupHeaderColors(isSticky);
  const text =
    count === 0
      ? strings.screens.photos.selection.selectItems
      : count === 1
        ? strings.screens.photos.selection.itemSelected
        : (strings.formatString(strings.screens.photos.selection.itemsSelected, count) as string);
  return (
    <AppText medium style={[tailwind('text-base'), { color: labelColor }]}>
      {text}
    </AppText>
  );
};

export const GroupHeaderUploadError = ({ count, isSticky, onPress }: UploadErrorProps): JSX.Element => {
  const tailwind = useTailwind();
  const { statusColor } = useGroupHeaderColors(isSticky);
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={ICON_HIT_SLOP}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      <AppText medium style={[tailwind('text-base'), { color: statusColor }]}>
        {count.toLocaleString()} {strings.screens.photos.groupHeader.withError}
      </AppText>
      <WarningCircleIcon size={24} color={statusColor} weight="fill" />
    </TouchableOpacity>
  );
};
