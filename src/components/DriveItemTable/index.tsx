import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, TouchableHighlight, Animated, Easing } from 'react-native';

import { FolderIcon, getFileTypeIcon } from '../../helpers';
import prettysize from 'prettysize';
import globalStyle from '../../styles/global';
import { useAppSelector } from '../../store/hooks';
import { ArrowCircleUp, DotsThree } from 'phosphor-react-native';
import strings from '../../../assets/lang/strings';
import ProgressBar from '../AppProgressBar';
import { items } from '@internxt/lib';
import AppText from '../AppText';

import { DriveItemProps } from '../../types/drive';
import useDriveItem from '../../hooks/useDriveItem';
import { useTailwind } from 'tailwind-rn';

function DriveItemTable(props: DriveItemProps): JSX.Element {
  const tailwind = useTailwind();
  const { selectedItems } = useAppSelector((state) => state.drive);
  const isSelectionMode = selectedItems.length > 0;
  const spinValue = new Animated.Value(1);
  const iconSize = 40;
  const IconFile = getFileTypeIcon(props.data.type || '');
  const { isFolder, isIdle, isUploading, isDownloading, onItemPressed, onItemLongPressed, onActionsButtonPressed } =
    useDriveItem(props);

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
      underlayColor={tailwind('text-neutral-20').color as string}
      onLongPress={onItemLongPressed}
      onPress={onItemPressed}
    >
      <View style={[tailwind('flex-row pl-5')]}>
        <View style={[tailwind('flex-row flex-1 py-3')]}>
          <View style={[tailwind('mb-1 mr-4 items-center justify-center'), isUploading && tailwind('opacity-40')]}>
            {isFolder ? (
              <FolderIcon width={iconSize} height={iconSize} />
            ) : (
              <IconFile width={iconSize} height={iconSize} />
            )}
          </View>

          <View style={[tailwind('flex-1 flex items-start justify-center')]}>
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
                  <ArrowCircleUp weight="fill" color={tailwind('text-blue-60').color as string} size={16} />
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

            {isIdle &&
              (props.subtitle ? (
                props.subtitle
              ) : (
                <AppText style={tailwind('text-xs text-neutral-100')}>
                  {!isFolder && (
                    <>
                      {prettysize(props.data.size || 0)}
                      <AppText bold> · </AppText>
                    </>
                  )}
                  Updated{' '}
                  {new Date(props.data.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </AppText>
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
            <DotsThree weight="bold" size={22} color={tailwind('text-neutral-60').color as string} />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableHighlight>
  );
}

export default DriveItemTable;
