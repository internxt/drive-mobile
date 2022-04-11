import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, TouchableHighlight, Animated, Easing } from 'react-native';

import { FolderIcon, getFileTypeIcon } from '../../helpers';
import { getColor, tailwind } from '../../helpers/designSystem';
import prettysize from 'prettysize';
import globalStyle from '../../styles';
import { useAppSelector } from '../../store/hooks';
import { ArrowCircleUp, DotsThree } from 'phosphor-react-native';
import strings from '../../../assets/lang/strings';
import ProgressBar from '../ProgressBar';
import { items } from '@internxt/lib';
import AppText from '../AppText';

import { DriveItemProps, DriveItemStatus } from '../../types/drive';
import useDriveItem from '../../hooks/useDriveItem';

function DriveItemTable(props: DriveItemProps): JSX.Element {
  const { selectedItems } = useAppSelector((state) => state.drive);
  const isSelectionMode = selectedItems.length > 0;
  const spinValue = new Animated.Value(1);
  const iconSize = 40;
  const IconFile = getFileTypeIcon(props.data.type || '');
  const {
    isFolder,
    isIdle,
    isUploading,
    isDownloading,
    downloadProgress,
    decryptionProgress,
    onItemPressed,
    onItemLongPressed,
    onActionsButtonPressed,
  } = useDriveItem(props);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 0,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  return (
    <TouchableHighlight
      disabled={isUploading || isDownloading}
      underlayColor={getColor('neutral-20')}
      onLongPress={onItemLongPressed}
      onPress={onItemPressed}
    >
      <View style={[tailwind('flex-row')]}>
        <View style={[tailwind('flex-grow flex-shrink overflow-hidden flex-row')]}>
          <View
            style={[
              tailwind('w-full mb-1 flex-grow items-center justify-center'),
              isUploading && tailwind('opacity-40'),
            ]}
          >
            {isFolder ? (
              <FolderIcon width={iconSize} height={iconSize} />
            ) : (
              <IconFile width={iconSize} height={iconSize} />
            )}
          </View>

          <View style={[tailwind('flex-grow flex items-start justify-center border')]}>
            <AppText
              style={[
                tailwind('text-left text-base text-neutral-500'),
                isUploading && tailwind('opacity-40'),
                globalStyle.fontWeight.medium,
              ]}
              numberOfLines={1}
              ellipsizeMode={'middle'}
            >
              {items.getItemDisplayName(props.data)}
            </AppText>

            {isUploading &&
              (props.progress === 0 ? (
                <Text style={tailwind('text-xs text-blue-60')}>{strings.screens.drive.encrypting}</Text>
              ) : (
                <View style={tailwind('flex-row items-center')}>
                  <ArrowCircleUp weight="fill" color={getColor('blue-60')} size={16} />
                  <AppText style={tailwind('ml-1.5 text-xs text-blue-60')}>
                    {((props.progress || 0) * 100).toFixed(0) + '%'}
                  </AppText>
                  <ProgressBar
                    style={tailwind('flex-grow h-1 ml-1.5')}
                    progressStyle={tailwind('h-1')}
                    totalValue={1}
                    currentValue={props.progress || 0}
                  />
                </View>
              ))}

            {isDownloading && (
              <Text style={tailwind('text-xs text-blue-60')}>
                {downloadProgress >= 0 &&
                  downloadProgress < 1 &&
                  'Downloading ' + (downloadProgress * 100).toFixed(0) + '%'}
                {downloadProgress >= 1 && decryptionProgress === -1 && 'Decrypting'}
                {decryptionProgress >= 0 && 'Decrypting ' + Math.max(decryptionProgress * 100, 0).toFixed(0) + '%'}
              </Text>
            )}

            {isIdle &&
              (props.subtitle ? (
                props.subtitle
              ) : (
                <Text style={tailwind('text-xs text-neutral-100')}>
                  {!isFolder && (
                    <>
                      {prettysize(props.data.size || 0)}
                      <Text style={globalStyle.fontWeight.bold}> · </Text>
                    </>
                  )}
                  Updated{' '}
                  {new Date(props.data.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              ))}
          </View>
        </View>

        <TouchableOpacity
          disabled={isUploading || isDownloading}
          style={isSelectionMode && tailwind('hidden')}
          onPress={onActionsButtonPressed}
          onLongPress={onActionsButtonPressed}
        >
          <View style={[isUploading && tailwind('opacity-40'), tailwind('px-5 flex-1 items-center justify-center')]}>
            <DotsThree weight="bold" size={22} color={getColor('neutral-60')} />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableHighlight>
  );
}

export default DriveItemTable;
