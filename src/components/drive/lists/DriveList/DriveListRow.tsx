import { memo } from 'react';
import { View } from 'react-native';

import { DriveListType, DriveListViewMode } from '@internxt-mobile/types/drive/ui';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../../hooks/useColor';
import { DriveListItem } from '../../../../types/drive/item';
import { DriveGridModeItem } from '../items/DriveGridModeItem';
import { DriveListModeItem } from '../items/DriveListModeItem';

const LIST_SEPARATOR_HEIGHT = 1;
const LIST_SEPARATOR_MARGIN = 16;

interface DriveListRowProps {
  item: DriveListItem;
  type: DriveListType;
  viewMode: DriveListViewMode;
  hideOptionsButton?: boolean;
  onActionsPress: (driveItem: DriveListItem) => void;
  onPress?: (driveItem: DriveListItem) => void;
}

const DriveListRowComponent = ({
  item,
  type,
  viewMode,
  hideOptionsButton,
  onActionsPress,
  onPress,
}: DriveListRowProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const isList = viewMode === DriveListViewMode.List;
  const ItemComponent = isList ? DriveListModeItem : DriveGridModeItem;

  return (
    <View
      style={[
        tailwind('flex justify-center'),
        { width: isList ? '100%' : '33%', backgroundColor: getColor('bg-surface') },
      ]}
    >
      <ItemComponent
        type={type}
        data={item.data}
        status={item.status}
        progress={item.progress}
        folderUploadProgress={item.folderUploadProgress}
        viewMode={viewMode}
        onActionsPress={() => onActionsPress(item)}
        onPress={onPress ? () => onPress(item) : undefined}
        hideOptionsButton={hideOptionsButton}
      />
      {isList ? (
        <View
          style={{
            height: LIST_SEPARATOR_HEIGHT,
            backgroundColor: getColor('bg-gray-1'),
            marginHorizontal: LIST_SEPARATOR_MARGIN,
          }}
        />
      ) : (
        <View />
      )}
    </View>
  );
};

export const DriveListRow = memo(DriveListRowComponent);
