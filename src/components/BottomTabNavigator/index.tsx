import React from 'react';
import { View, TouchableWithoutFeedback, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';

import { getColor, tailwind } from '../../helpers/designSystem';
import globalStyle from '../../styles/global.style';
import strings from '../../../assets/lang/strings';
import { useAppDispatch } from '../../store/hooks';
import { layoutActions } from '../../store/slices/layout';
import { Folder, Gear, House, ImageSquare, PlusCircle } from 'phosphor-react-native';

const tabIcons = {
  home: House,
  drive: Folder,
  create: PlusCircle,
  photos: ImageSquare,
  menu: Gear,
};

function BottomTabNavigator(props: BottomTabBarProps): JSX.Element {
  const dispatch = useAppDispatch();
  const items = props.state.routes.map((route, index) => {
    const { options } = props.descriptors[route.key];
    const label = strings.tabs[route.name as keyof typeof tabIcons];
    const isFocused = props.state.index === index;
    const isCreateRoute = route.name === 'create';
    const onPress = () => {
      if (isCreateRoute) {
        return dispatch(layoutActions.setShowUploadFileModal(true));
      }
      const event = props.navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        props.navigation.navigate(route.name);
      }
    };
    const onLongPress = () => {
      props.navigation.emit({ type: 'tabLongPress', target: route.key });
    };
    const iconColor = isCreateRoute ? getColor('white') : isFocused ? getColor('blue-60') : getColor('neutral-80');
    const Icon = tabIcons[route.name as keyof typeof tabIcons];

    return (
      <TouchableWithoutFeedback
        key={`button-tab-${route.name}`}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <View style={tailwind('h-14 items-center justify-center flex-1')}>
          {isCreateRoute ? (
            <Icon weight="fill" color={getColor('blue-60')} size={40} />
          ) : (
            <Icon weight={isFocused ? 'fill' : undefined} color={iconColor} size={26} />
          )}

          {options.tabBarShowLabel && !isCreateRoute && (
            <Text
              style={[
                tailwind('text-supporting-2'),
                isFocused ? tailwind('text-blue-60') : tailwind('text-neutral-80'),
                isFocused ? globalStyle.fontWeight.medium : globalStyle.fontWeight.regular,
              ]}
            >
              {label}
            </Text>
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  });

  return (
    <View style={[tailwind('bg-white flex-row px-2 justify-around items-center border-t border-neutral-20')]}>
      {items}
    </View>
  );
}

export default BottomTabNavigator;
