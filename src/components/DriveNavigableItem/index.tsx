import React from 'react';
import { TouchableHighlight, TouchableOpacity, View } from 'react-native';
import { getColor, tailwind } from '../../helpers/designSystem';
import { FolderIcon, getFileTypeIcon } from '../../helpers';
import { items } from '@internxt/lib';
import AppText from '../AppText';
import prettysize from 'prettysize';
import { CaretRight } from 'phosphor-react-native';
import globalStyle from '../../styles';
import { DriveNavigableItemProps } from '../../types/drive';

const DriveNavigableItem: React.FC<DriveNavigableItemProps> = ({ isLoading, disabled, ...props }) => {
  const isFolder = !props.data.type ? true : false;
  const iconSize = 40;
  const IconFile = getFileTypeIcon(props.data.type || '');

  const onItemLongPressed = () => {
    onItemPressed();
  };

  const onItemPressed = () => {
    if (props.onItemPressed && !disabled) {
      props.onItemPressed(props.data);
    }
  };

  const onNavigationButtonPressed = () => {
    if (!disabled) {
      props.onNavigationButtonPressed(props.data);
    }
  };
  return (
    <TouchableHighlight
      disabled={isLoading || disabled}
      style={tailwind(`${disabled || isLoading ? 'opacity-50' : 'opacity-100'}`)}
      underlayColor={getColor('neutral-20')}
      onLongPress={onItemLongPressed}
      onPress={onItemPressed}
    >
      <View style={[tailwind('flex-row justify-between')]}>
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
              style={[tailwind('text-left text-base text-neutral-500'), globalStyle.fontWeight.medium]}
              numberOfLines={1}
              ellipsizeMode={'middle'}
            >
              {items.getItemDisplayName(props.data)}
            </AppText>

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
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          disabled={isLoading}
          onPress={onNavigationButtonPressed}
          onLongPress={onNavigationButtonPressed}
        >
          <View style={[tailwind('flex-1 items-center justify-center')]}>
            <CaretRight weight="bold" size={22} color={getColor('neutral-60')} />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableHighlight>
  );
};

export default DriveNavigableItem;
