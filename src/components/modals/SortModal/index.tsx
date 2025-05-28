import React from 'react';
import { useColorScheme, View } from 'react-native';

import strings from '../../../../assets/lang/strings';

import { TouchableOpacity } from 'react-native-gesture-handler';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';
import { SortDirection, SortType } from '../../../types/drive';
import { BaseModalProps } from '../../../types/ui';
import AppText from '../../AppText';
import BottomModal from '../BottomModal';

export type SortMode = {
  direction: SortDirection;
  type: SortType;
};
export interface SortModalProps extends BaseModalProps {
  onSortModeChange: (change: SortMode) => void;

  sortMode: SortMode;
}
const SortModal: React.FC<SortModalProps> = (props) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const onClosed = () => {
    props.onClose();
  };

  const header = (
    <View>
      <AppText
        numberOfLines={1}
        ellipsizeMode="middle"
        semibold
        style={[tailwind('text-lg'), { color: getColor('text-gray-100') }]}
      >
        {strings.screens.drive.sortBy}
      </AppText>
    </View>
  );

  return (
    <BottomModal
      isOpen={props.isOpen}
      onClosed={onClosed}
      header={header}
      containerStyle={tailwind('p-4')}
      style={{ backgroundColor: getColor('bg-surface') }}
    >
      <SortModalItem
        isSelected={props.sortMode.direction === SortDirection.Asc && props.sortMode.type === SortType.Name}
        direction={SortDirection.Asc}
        type={SortType.Name}
        text={strings.components.app_menu.filter.name}
        advice={strings.screens.drive.aToZ}
        onSortModeChange={props.onSortModeChange}
      />
      <SortModalItem
        isSelected={props.sortMode.direction === SortDirection.Desc && props.sortMode.type === SortType.Name}
        direction={SortDirection.Desc}
        type={SortType.Name}
        text={strings.components.app_menu.filter.name}
        advice={strings.screens.drive.zToA}
        onSortModeChange={props.onSortModeChange}
      />
      <SortModalItem
        isSelected={props.sortMode.direction === SortDirection.Asc && props.sortMode.type === SortType.Size}
        direction={SortDirection.Asc}
        type={SortType.Size}
        text={strings.components.app_menu.filter.size}
        advice={strings.screens.drive.ascending}
        onSortModeChange={props.onSortModeChange}
      />
      <SortModalItem
        isSelected={props.sortMode.direction === SortDirection.Desc && props.sortMode.type === SortType.Size}
        direction={SortDirection.Desc}
        type={SortType.Size}
        text={strings.components.app_menu.filter.size}
        advice={strings.screens.drive.descending}
        onSortModeChange={props.onSortModeChange}
      />
      <SortModalItem
        isSelected={props.sortMode.direction === SortDirection.Asc && props.sortMode.type === SortType.UpdatedAt}
        direction={SortDirection.Asc}
        type={SortType.UpdatedAt}
        text={strings.components.app_menu.filter.date}
        advice={strings.screens.drive.newerFirst}
        onSortModeChange={props.onSortModeChange}
      />
      <SortModalItem
        isSelected={props.sortMode.direction === SortDirection.Desc && props.sortMode.type === SortType.UpdatedAt}
        direction={SortDirection.Desc}
        type={SortType.UpdatedAt}
        text={strings.components.app_menu.filter.date}
        advice={strings.screens.drive.olderFirst}
        onSortModeChange={props.onSortModeChange}
      />
    </BottomModal>
  );
};

function SortModalItem(props: {
  direction: SortDirection;
  type: SortType;
  text: string;
  advice: string;
  isSelected: boolean;
  onSortModeChange: (change: SortMode) => void;
}) {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const onPress = () => {
    props.onSortModeChange({ type: props.type, direction: props.direction });
  };

  return (
    <TouchableOpacity activeOpacity={0.65} style={tailwind('rounded-lg')} onPress={onPress}>
      <View
        style={[
          tailwind('items-center flex-row rounded-lg px-4 py-2.5'),
          props.isSelected && (isDark ? { backgroundColor: getColor('bg-gray-10') } : tailwind('bg-primary/10')),
        ]}
      >
        <AppText
          style={[
            tailwind('text-lg mr-2'),
            {
              color: props.isSelected ? getColor('text-primary') : getColor('text-gray-100'),
            },
          ]}
          semibold
        >
          {props.text}
        </AppText>
        <AppText
          style={[
            { textAlignVertical: 'center' },
            tailwind('opacity-50'),
            {
              color: props.isSelected ? getColor('text-primary') : getColor('text-gray-100'),
            },
          ]}
        >
          {props.advice}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

export default SortModal;
