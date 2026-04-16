import { CloudArrowDownIcon, CheckCircleIcon, PauseCircleIcon, PlayCircleIcon, WarningCircleIcon } from 'phosphor-react-native';
import { ActivityIndicator } from 'react-native';
import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../../assets/lang/strings';

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

interface FetchingProps {
  color: string;
}

export const GroupHeaderFetching = ({ color }: FetchingProps): JSX.Element => {
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
}

export const GroupHeaderUploading = ({ count, primaryColor, labelColor, statusColor }: UploadingProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <>
      <ActivityIndicator size="small" color={primaryColor} />
      <AppText medium style={[tailwind('text-base'), { color: labelColor, lineHeight: 24 }]}>
        {strings.screens.photos.groupHeader.backingUp}
      </AppText>
      {count != null && (
        <AppText style={[tailwind('text-sm'), { color: statusColor, lineHeight: 24 }]}>
          {count.toLocaleString()} {strings.screens.photos.groupHeader.items}
        </AppText>
      )}
      <PauseCircleIcon size={24} color={primaryColor} weight="fill" />
    </>
  );
};

interface PausedProps {
  count: number;
  primaryColor: string;
  labelColor: string;
  statusColor: string;
}

export const GroupHeaderPaused = ({ count, primaryColor, labelColor, statusColor }: PausedProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <>
      <AppText medium style={[tailwind('text-base'), { color: labelColor, lineHeight: 24 }]}>
        {strings.screens.photos.groupHeader.backupPaused}
      </AppText>
      <AppText style={[tailwind('text-sm'), { color: statusColor, lineHeight: 24 }]}>
        {count.toLocaleString()} {strings.screens.photos.groupHeader.items}
      </AppText>
      <PlayCircleIcon size={24} color={primaryColor} weight="fill" />
    </>
  );
};

interface PausedStorageFullProps {
  dangerColor: string;
}

export const GroupHeaderPausedStorageFull = ({ dangerColor }: PausedStorageFullProps): JSX.Element => {
  const tailwind = useTailwind();
  return (
    <>
      <AppText medium style={[tailwind('text-base'), { color: dangerColor }]}>
        {strings.screens.photos.groupHeader.backupPaused}
      </AppText>
      <AppText style={[tailwind('text-sm'), { color: dangerColor }]}>
        {strings.screens.photos.groupHeader.storageFull}
      </AppText>
      <WarningCircleIcon size={24} color={dangerColor} weight="fill" />
    </>
  );
};

interface CompletedProps {
  color: string;
}

export const GroupHeaderCompleted = ({ color }: CompletedProps): JSX.Element => {
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
