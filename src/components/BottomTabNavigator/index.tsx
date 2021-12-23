import React from 'react';
import { View, TouchableWithoutFeedback, Text } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';

import { getColor, tailwind } from '../../helpers/designSystem';
import globalStyle from '../../styles/global.style';
import strings from '../../../assets/lang/strings';
import { useAppDispatch } from '../../store/hooks';
import { layoutActions } from '../../store/slices/layout';

const tabIcons = {
  home: Unicons.UilEstate,
  drive: Unicons.UilHdd,
  create: Unicons.UilPlus,
  photos: Unicons.UilImage,
  menu: Unicons.UilBars,
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
        <View style={tailwind('flex-grow h-14 items-center justify-center')}>
          {isCreateRoute && <View style={tailwind('absolute bg-blue-60 h-8 w-8 rounded-3xl')} />}

          <Icon color={iconColor} size={24} />
          {options.tabBarShowLabel && !isCreateRoute && (
            <Text
              style={[
                tailwind('text-supporting-2 mt-0.5'),
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
