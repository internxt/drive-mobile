import strings from 'assets/lang/strings';
import prettysize from 'prettysize';
import { TouchableOpacity, View } from 'react-native';
import AppProgressBar from 'src/components/AppProgressBar';
import AppText from 'src/components/AppText';
import CenterModal from 'src/components/modals/CenterModal';
import { getDisplayName } from 'src/helpers/itemNames';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import { FILE_COMPLETE_PROGRESS, SelectionDownloadProgress } from './useFetchSelectedFiles';

const PROGRESS_BAR_HEIGHT = 4;

interface DownloadSelectedItemsModalProps {
  isOpen: boolean;
  downloadProgress: SelectionDownloadProgress | null;
  onCancelPress: () => void;
}

const getFileProgressText = ({
  currentFileBytesReceived,
  currentFileTotalBytes,
  isCurrentFileComplete,
}: SelectionDownloadProgress) => {
  if (!isCurrentFileComplete && currentFileTotalBytes === 0) {
    return `${strings.generic.calculating}...`;
  }
  if (!isCurrentFileComplete && currentFileBytesReceived >= currentFileTotalBytes) {
    return `${strings.generic.decrypting}...`;
  }
  const bytesReceivedText = prettysize(currentFileBytesReceived);
  const totalBytesText = prettysize(currentFileTotalBytes);
  return `${bytesReceivedText} ${strings.modals.downloadingFile.of} ${totalBytesText}`;
};

export const DownloadSelectedItemsModal = ({
  isOpen,
  downloadProgress,
  onCancelPress,
}: DownloadSelectedItemsModalProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const fileCount = downloadProgress?.fileCount ?? 0;
  const currentFileNumber = (downloadProgress?.currentFileIndex ?? 0) + 1;

  return (
    <CenterModal
      isOpen={isOpen}
      backdropPressToClose={false}
      backButtonClose={false}
      onClosed={() => {
        /** NOOP */
      }}
    >
      <>
        <View style={tailwind('mt-6 mb-4 mx-6')}>
          <AppText medium style={[tailwind('text-lg text-center'), { color: getColor('text-gray-100') }]}>
            {strings.modals.downloadingFiles.title}
          </AppText>
          <AppText style={[tailwind('text-center mt-1'), { color: getColor('text-gray-50') }]}>
            {strings.formatString(strings.modals.downloadingFiles.progress, currentFileNumber, fileCount)}
          </AppText>
          {downloadProgress && (
            <>
              <AppText
                numberOfLines={1}
                ellipsizeMode="middle"
                style={[tailwind('text-center mt-2'), { color: getColor('text-gray-100') }]}
              >
                {getDisplayName(downloadProgress.currentFile)}
              </AppText>
              <AppText style={[tailwind('text-sm text-center mt-1'), { color: getColor('text-gray-50') }]}>
                {getFileProgressText(downloadProgress)}
              </AppText>
            </>
          )}
        </View>
        <View style={tailwind('mx-6 mb-6')}>
          <AppProgressBar
            totalValue={FILE_COMPLETE_PROGRESS}
            height={PROGRESS_BAR_HEIGHT}
            style={{ backgroundColor: getColor('bg-gray-5') }}
            currentValue={downloadProgress?.currentFileProgress ?? 0}
          />
        </View>
        <TouchableOpacity
          onPress={onCancelPress}
          style={[
            tailwind('h-14 flex items-center justify-center border-t'),
            { borderTopColor: getColor('border-gray-10') },
          ]}
        >
          <AppText medium style={{ color: getColor('text-gray-100') }}>
            {strings.buttons.cancel}
          </AppText>
        </TouchableOpacity>
      </>
    </CenterModal>
  );
};
