import React from 'react';
import { TouchableHighlight, View } from 'react-native';
import { FolderIcon, getFileTypeIcon } from '../../helpers';
import { items } from '@internxt/lib';
import AppText from '../AppText';
import prettysize from 'prettysize';
import { CaretRight } from 'phosphor-react-native';
import globalStyle from '../../styles/global';
import { DriveNavigableItemProps } from '../../types/drive';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';

const DriveNavigableItem: React.FC<DriveNavigableItemProps> = ({ isLoading, disabled, ...props }) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const isFolder = !props.data.fileId;
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
      style={tailwind(`${isDisabled ? 'opacity-40' : 'opacity-100'}`)}
      underlayColor={isDisabled ? 'transparent' : getColor('text-gray-40')}
      onLongPress={onItemLongPressed}
      onPress={onItemPressed}
    >
      <View style={[tailwind('px-4 flex-row justify-between')]}>
        <View style={[tailwind('flex-row flex-1 py-3')]}>
          <View style={[tailwind('mb-1 mr-4 items-center justify-center')]}>
            {isFolder ? (
              <FolderIcon width={iconSize} height={iconSize} />
            ) : (
              <IconFile width={iconSize} height={iconSize} />
            )}
          </View>

          <View style={[tailwind('flex-1 flex items-start justify-center')]}>
            <AppText
              style={[tailwind('text-left text-base text-gray-100'), globalStyle.fontWeight.medium]}
              numberOfLines={1}
              ellipsizeMode={'middle'}
            >
              {items.getItemDisplayName(props.data)}
            </AppText>

            <AppText style={tailwind('text-xs text-gray-50')}>
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
          <View style={[tailwind('items-center justify-center')]}>
            <CaretRight weight="bold" size={22} color={getColor('text-gray-60')} />
          </View>
        )}
      </View>
    </TouchableHighlight>
  );
};

export default DriveNavigableItem;
