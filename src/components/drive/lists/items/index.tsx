import { useEffect } from 'react';
import { Animated, Easing, Text, TouchableHighlight, TouchableOpacity, View } from 'react-native';

import { items } from '@internxt/lib';
import { ArrowCircleUp, DotsThree, Link } from 'phosphor-react-native';
import prettysize from 'prettysize';
import strings from '../../../../../assets/lang/strings';
import { FolderIcon, getFileTypeIcon } from '../../../../helpers';
import ProgressBar from '../../../AppProgressBar';
import AppText from '../../../AppText';

import { time } from '@internxt-mobile/services/common/time';
import { DriveListType } from '@internxt-mobile/types/drive/ui';
import useGetColor from '../../../../hooks/useColor';
import useDriveItem from '../../../../hooks/useDriveItem';
import { DriveItemProps } from '../../../../types/drive/ui';

function DriveItemTable(props: DriveItemProps): JSX.Element {
  const getColor = useGetColor();

  const spinValue = new Animated.Value(1);
  const iconSize = 40;
  const IconFile = getFileTypeIcon(props.data.type || '');
  const { isFolder, isIdle, isUploading, isDownloading, onItemPressed, onItemLongPressed, onActionsButtonPressed } =
    useDriveItem({ ...props, isSharedLinkItem: props.type === DriveListType.Shared, shareLink: props.shareLink });

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

  const getUpdatedAt = () => {
    return time.getFormattedDate(props.data.createdAt, time.formats.dateAtTime);
  };

  const handleItemPress = () => {
    if (props.onPress) {
      props.onPress();
    } else {
      onItemPressed();
    }
  };

  return (
    <TouchableHighlight
      disabled={isUploading || isDownloading}
      underlayColor={getColor('bg-gray-5')}
      onLongPress={onItemLongPressed}
      onPress={handleItemPress}
      style={{ backgroundColor: getColor('bg-surface') }}
    >
      <View className="flex-row pl-5" style={{ backgroundColor: getColor('bg-surface') }}>
        <View className="flex-row flex-1 py-3">
          <View className={`mb-1 mr-4 items-center justify-center ${isUploading ? 'opacity-40' : ''}`}>
            {isFolder ? (
              <FolderIcon width={iconSize} height={iconSize} />
            ) : (
              <IconFile width={iconSize} height={iconSize} />
            )}
            {props.type === DriveListType.Shared && (
              <View
                className="absolute -bottom-1 -right-2 flex items-center justify-center rounded-full"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: getColor('bg-surface'),
                }}
              >
                <View
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: getColor('text-primary'),
                  }}
                >
                  <Link weight="bold" size={10} color={getColor('text-white')} />
                </View>
              </View>
            )}
          </View>

          <View className="flex-1 flex items-start justify-center">
            <AppText
              className={`text-left text-base ${isUploading ? 'opacity-40' : ''}`}
              style={{ color: getColor('text-gray-100') }}
              numberOfLines={1}
              ellipsizeMode={'middle'}
              medium
            >
              {items.getItemDisplayName(props.data)}
            </AppText>

            {isUploading &&
              (props.progress === 0 ? (
                <Text className="text-xs" style={{ color: getColor('text-primary') }}>
                  {strings.screens.drive.encrypting}
                </Text>
              ) : (
                <View className="flex-row items-center">
                  <ArrowCircleUp weight="fill" color={getColor('text-primary')} size={16} />
                  <AppText className="ml-1.5 text-xs" style={{ color: getColor('text-primary') }}>
                    {((props.progress || 0) * 100).toFixed(0) + '%'}
                  </AppText>
                  <ProgressBar
                    className="flex-grow h-1 ml-1.5"
                    progressClassName="h-1"
                    totalValue={1}
                    height={4}
                    currentValue={props.progress || 0}
                  />
                </View>
              ))}

            {isIdle &&
              props.type !== DriveListType.Shared &&
              (props.subtitle ? (
                props.subtitle
              ) : (
                <View className="flex flex-row items-center">
                  {!isFolder && (
                    <AppText className="text-xs" style={{ color: getColor('text-gray-60') }}>
                      {prettysize(props.data.size || 0)}
                    </AppText>
                  )}
                  {!isFolder && (
                    <View
                      className="rounded-full mx-1.5"
                      style={{
                        width: 3,
                        height: 3,
                        backgroundColor: getColor('text-gray-60'),
                      }}
                    />
                  )}
                  <AppText className="text-xs" style={{ color: getColor('text-gray-60') }}>
                    {getUpdatedAt()}
                  </AppText>
                </View>
              ))}
          </View>
        </View>

        <TouchableOpacity
          disabled={isUploading || isDownloading}
          onPress={onActionsButtonPressed}
          onLongPress={onActionsButtonPressed}
        >
          <View className={`px-5 flex-1 items-center justify-center ${isUploading ? 'opacity-40' : ''}`}>
            <DotsThree weight="bold" size={22} color={getColor('text-gray-40')} />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableHighlight>
  );
}

export default DriveItemTable;
