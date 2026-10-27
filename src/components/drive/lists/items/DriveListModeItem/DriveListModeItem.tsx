import { memo } from 'react';
import { TouchableHighlight, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { items } from '@internxt/lib';
import { ArrowCircleUp, DotsThree, Link, XCircle } from 'phosphor-react-native';
import prettysize from 'prettysize';
import strings from '../../../../../../assets/lang/strings';
import { FolderIcon, getFileTypeIcon } from '../../../../../helpers';
import ProgressBar from '../../../../AppProgressBar';
import AppText from '../../../../AppText';

import { time } from '@internxt-mobile/services/common/time';
import { DriveListType } from '@internxt-mobile/types/drive/ui';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../../../hooks/useColor';
import { DriveItemStatus } from '../../../../../types/drive/item';
import { DriveItemProps } from '../../../../../types/drive/ui';
import { LONG_PRESS_DELAY_MS } from '../itemPress';
import { SelectionCheckbox, SQUARE_CHECKBOX_SIZE } from '../SelectionCheckbox';
import { useSelectionModeProgress } from '../SelectionModeContext';
import { useSelectionProgress } from '../useSelectionProgress';

const ROW_LEFT_PADDING = 20;
const CHECKBOX_LEFT = 16;
const CHECKBOX_RIGHT_MARGIN = 16;
const CHECKBOX_SLOT_WIDTH = CHECKBOX_LEFT + SQUARE_CHECKBOX_SIZE + CHECKBOX_RIGHT_MARGIN - ROW_LEFT_PADDING;

type DriveListModeItemContentProps = Pick<
  DriveItemProps,
  'type' | 'data' | 'status' | 'progress' | 'subtitle' | 'folderUploadProgress'
>;

const DriveListModeItemContent = memo((props: DriveListModeItemContentProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const iconSize = 40;
  const IconFile = getFileTypeIcon(props.data.type || '');
  const isFolder = props.data.isFolder;
  const isIdle = props.status === DriveItemStatus.Idle;
  const isUploading = props.status === DriveItemStatus.Uploading;
  const isFolderUploading = isUploading && isFolder && !!props.folderUploadProgress;
  const isFolderScanning = isUploading && isFolder && !props.folderUploadProgress;

  const getUpdatedAt = () => {
    if (props.data.createdAt) {
      return time.getFormattedDate(props.data.createdAt, time.formats.dateAtTime);
    }

    return '';
  };

  const progress = props.progress;

  const renderUploadProgress = () => {
    if (isFolderScanning) {
      return (
        <AppText style={[tailwind('text-xs'), { color: getColor('text-primary') }]}>
          {strings.screens.drive.scanningFolder}
        </AppText>
      );
    }
    if (isFolderUploading) {
      return (
        <View style={tailwind('flex-row items-center')}>
          <ArrowCircleUp weight="fill" color={getColor('text-primary')} size={16} />
          <AppText style={[tailwind('ml-1.5 text-xs'), { color: getColor('text-primary') }]}>
            {`${props.folderUploadProgress!.uploadedFiles} / ${props.folderUploadProgress!.totalFiles}`}
            {props.folderUploadProgress!.failedFiles > 0
              ? `  •  ${props.folderUploadProgress!.failedFiles} failed`
              : ''}
          </AppText>
        </View>
      );
    }
    if (progress === 0) {
      return (
        <AppText style={[tailwind('text-xs'), { color: getColor('text-primary') }]}>
          {strings.screens.drive.encrypting}
        </AppText>
      );
    }
    return (
      <View style={tailwind('flex-row items-center')}>
        <ArrowCircleUp weight="fill" color={getColor('text-primary')} size={16} />
        <AppText style={[tailwind('ml-1.5 text-xs'), { color: getColor('text-primary') }]}>
          {((progress || 0) * 100).toFixed(0) + '%'}
        </AppText>
        <ProgressBar
          style={tailwind('flex-grow h-1 ml-1.5')}
          progressStyle={tailwind('h-1')}
          totalValue={1}
          currentValue={progress || 0}
        />
      </View>
    );
  };

  return (
    <View style={[tailwind('flex-row flex-1 py-3')]}>
      <View style={[tailwind('mb-1 mr-4 items-center justify-center'), isUploading && tailwind('opacity-40')]}>
        {isFolder ? <FolderIcon width={iconSize} height={iconSize} /> : <IconFile width={iconSize} height={iconSize} />}
        {props.type === DriveListType.Shared && (
          <View
            style={[
              tailwind('absolute -bottom-1 -right-2 flex items-center justify-center rounded-full'),
              {
                width: 20,
                height: 20,
                backgroundColor: getColor('bg-surface'),
              },
            ]}
          >
            <View
              style={[
                tailwind('rounded-full flex items-center justify-center'),
                {
                  width: 16,
                  height: 16,
                  backgroundColor: getColor('text-primary'),
                },
              ]}
            >
              <Link weight="bold" size={10} color={getColor('text-white')} />
            </View>
          </View>
        )}
      </View>

      <View style={[tailwind('flex-1 flex items-start justify-center')]}>
        <AppText
          style={[
            tailwind('text-left text-base'),
            { color: getColor('text-gray-100') },
            isUploading && tailwind('opacity-40'),
          ]}
          numberOfLines={1}
          ellipsizeMode={'middle'}
        >
          {items.getItemDisplayName({
            name: props.data.name,
            type: props.data.type,
          })}
        </AppText>

        {isUploading && renderUploadProgress()}

        {isIdle &&
          props.type !== DriveListType.Shared &&
          (props.subtitle ? (
            props.subtitle
          ) : (
            <View style={tailwind('flex flex-row items-center')}>
              {!isFolder && (
                <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-60') }]}>
                  {prettysize(props.data.size || 0)}
                </AppText>
              )}
              {!isFolder && (
                <View
                  style={[
                    tailwind('rounded-full mx-1.5'),
                    {
                      width: 3,
                      height: 3,
                      backgroundColor: getColor('text-gray-60'),
                    },
                  ]}
                />
              )}
              <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-60') }]}>{getUpdatedAt()}</AppText>
            </View>
          ))}
      </View>
    </View>
  );
});

export const DriveListModeItem = (props: DriveItemProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const isFolder = props.data.isFolder;
  const isUploading = props.status === DriveItemStatus.Uploading;
  const isDownloading = props.status === DriveItemStatus.Downloading;
  const isFolderUploading = isUploading && isFolder && !!props.folderUploadProgress;
  const isFolderScanning = isUploading && isFolder && !props.folderUploadProgress;

  const renderOptionsButton = () => {
    if (props.hideOptionsButton) {
      return null;
    }
    if (isFolderUploading || isFolderScanning) {
      return (
        <TouchableOpacity
          onPress={props.onActionsPress}
          accessibilityRole="button"
          accessibilityLabel={strings.buttons.cancel + ' folder upload'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={tailwind('px-5 flex-1 items-center justify-center')}>
            <XCircle weight="bold" size={22} color={getColor('text-primary')} />
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <Animated.View style={optionsButtonAnimatedStyle}>
        <TouchableOpacity
          disabled={isUploading || isDownloading}
          style={tailwind('flex-1')}
          onPress={props.onActionsPress}
          onLongPress={props.onActionsPress}
        >
          <View style={[isUploading && tailwind('opacity-40'), tailwind('px-5 flex-1 items-center justify-center')]}>
            <DotsThree weight="bold" size={22} color={getColor('text-gray-40')} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const selectionProgress = useSelectionProgress(!!props.isSelected);
  const surfaceColor = getColor('bg-surface');
  const selectedRowColor = getColor('bg-primary-10');
  const rowAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(selectionProgress.value, [0, 1], [surfaceColor, selectedRowColor]),
  }));

  const selectionModeProgress = useSelectionModeProgress();
  const isSelectable = !!props.selectable;
  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    opacity: selectionModeProgress.value,
    transform: [{ translateX: interpolate(selectionModeProgress.value, [0, 1], [-CHECKBOX_SLOT_WIDTH, 0]) }],
  }));
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: isSelectable ? selectionModeProgress.value * CHECKBOX_SLOT_WIDTH : 0 }],
  }));
  const optionsButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: isSelectable ? 1 - selectionModeProgress.value : 1,
  }));

  return (
    <TouchableHighlight
      disabled={!isFolderUploading && (isUploading || isDownloading)}
      underlayColor={getColor('bg-gray-5')}
      onLongPress={props.onLongPress ?? props.onActionsPress}
      delayLongPress={LONG_PRESS_DELAY_MS}
      onPress={props.onPress}
      style={{ backgroundColor: getColor('bg-surface') }}
    >
      <Animated.View style={[tailwind('flex-row pl-5'), rowAnimatedStyle]}>
        {isSelectable && (
          <Animated.View
            style={[tailwind('absolute top-0 bottom-0 justify-center'), { left: CHECKBOX_LEFT }, checkboxAnimatedStyle]}
          >
            <SelectionCheckbox checked={!!props.isSelected} shape="square" />
          </Animated.View>
        )}
        <Animated.View style={[tailwind('flex-1 flex-row'), contentAnimatedStyle]}>
          <DriveListModeItemContent
            type={props.type}
            data={props.data}
            status={props.status}
            progress={props.progress}
            subtitle={props.subtitle}
            folderUploadProgress={props.folderUploadProgress}
          />
        </Animated.View>
        {renderOptionsButton()}
      </Animated.View>
    </TouchableHighlight>
  );
};
