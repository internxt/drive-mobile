import { useEffect } from 'react';
import { Animated, Easing, Text, TouchableHighlight, TouchableOpacity, View } from 'react-native';

import { items } from '@internxt/lib';
import { ArrowCircleUp, DotsThree, Link } from 'phosphor-react-native';
import prettysize from 'prettysize';
import strings from '../../../../../assets/lang/strings';
import { FolderIcon, getFileTypeIcon } from '../../../../helpers';
import { useAppSelector } from '../../../../store/hooks';
import ProgressBar from '../../../AppProgressBar';
import AppText from '../../../AppText';

import { time } from '@internxt-mobile/services/common/time';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../../hooks/useColor';
import useDriveItem from '../../../../hooks/useDriveItem';
import { DriveItemProps, DriveListType } from '../../../../types/drive';

function DriveItemTable(props: DriveItemProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const { selectedItems } = useAppSelector((state) => state.drive);
  const isSelectionMode = selectedItems.length > 0;
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
      <View style={[tailwind('flex-row pl-5'), { backgroundColor: getColor('bg-surface') }]}>
        <View style={[tailwind('flex-row flex-1 py-3')]}>
          <View style={[tailwind('mb-1 mr-4 items-center justify-center'), isUploading && tailwind('opacity-40')]}>
            {isFolder ? (
              <FolderIcon width={iconSize} height={iconSize} />
            ) : (
              <IconFile width={iconSize} height={iconSize} />
            )}
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
              medium
            >
              {items.getItemDisplayName(props.data)}
            </AppText>

            {isUploading &&
              (props.progress === 0 ? (
                <Text style={[tailwind('text-xs'), { color: getColor('text-primary') }]}>
                  {strings.screens.drive.encrypting}
                </Text>
              ) : (
                <View style={tailwind('flex-row items-center')}>
                  <ArrowCircleUp weight="fill" color={getColor('text-primary')} size={16} />
                  <AppText style={[tailwind('ml-1.5 text-xs'), { color: getColor('text-primary') }]}>
                    {((props.progress || 0) * 100).toFixed(0) + '%'}
                  </AppText>
                  <ProgressBar
                    style={tailwind('flex-grow h-1 ml-1.5')}
                    progressStyle={tailwind('h-1')}
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

        <TouchableOpacity
          disabled={isUploading || isDownloading}
          style={isSelectionMode && tailwind('hidden')}
          onPress={onActionsButtonPressed}
          onLongPress={onActionsButtonPressed}
        >
          <View style={[isUploading && tailwind('opacity-40'), tailwind('px-5 flex-1 items-center justify-center')]}>
            <DotsThree weight="bold" size={22} color={getColor('text-gray-40')} />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableHighlight>
  );
}

export default DriveItemTable;
