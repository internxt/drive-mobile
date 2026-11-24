import { CaretRight } from 'phosphor-react-native';
import prettysize from 'prettysize';
import React from 'react';
import { TouchableHighlight, View } from 'react-native';
import { checkIsFolder, FolderIcon, getFileTypeIcon } from '../../helpers';
import { getDisplayName } from '../../helpers/itemNames';
import useGetColor from '../../hooks/useColor';
import globalStyle from '../../styles/global';
import { DriveNavigableItemProps } from '../../types/drive/ui';
import AppText from '../AppText';

const DriveNavigableItem: React.FC<DriveNavigableItemProps> = ({ isLoading, disabled, ...props }) => {
  const getColor = useGetColor();

  const isFolder = checkIsFolder(props.data);

  const iconSize = 40;
  const IconFile = getFileTypeIcon(props.data.type || '');

  const onItemPressed = () => {
    !disabled && props.onItemPressed && props.onItemPressed(props.data);
  };

  const onItemLongPressed = () => {
    onItemPressed();
  };

  const isDisabled = isLoading || disabled;

  return (
    <TouchableHighlight
      className={isDisabled ? 'opacity-40' : 'opacity-100'}
      underlayColor={isDisabled ? 'transparent' : getColor('bg-gray-10')}
      onLongPress={onItemLongPressed}
      onPress={onItemPressed}
    >
      <View className="px-4 flex-row justify-between">
        <View className="flex-row flex-1 py-3">
          <View className="mb-1 mr-4 items-center justify-center">
            {isFolder ? (
              <FolderIcon width={iconSize} height={iconSize} />
            ) : (
              <IconFile width={iconSize} height={iconSize} />
            )}
          </View>

          <View className="flex-1 flex items-start justify-center">
            <AppText
              className="text-left text-base"
              style={[{ color: getColor('text-gray-100') }, globalStyle.fontWeight.medium]}
              numberOfLines={1}
              ellipsizeMode={'middle'}
            >
              {getDisplayName(props.data)}
            </AppText>

            <AppText className="text-xs" style={{ color: getColor('text-gray-50') }}>
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
          </View>
        </View>

        {isFolder && (
          <View className="items-center justify-center">
            <CaretRight weight="bold" size={22} color={getColor('text-gray-60')} />
          </View>
        )}
      </View>
    </TouchableHighlight>
  );
};

export default DriveNavigableItem;
