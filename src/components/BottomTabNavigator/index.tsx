import React from 'react';
import { View, TouchableWithoutFeedback, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';

import globalStyle from '../../styles/global';
import strings from '../../../assets/lang/strings';
import { useAppDispatch } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import { FolderSimple, Gear, House, ImageSquare, PlusCircle } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import { storageThunks } from 'src/store/slices/storage';

const tabs = {
  Home: { label: strings.tabs.Home, icon: House },
  Drive: { label: strings.tabs.Drive, icon: FolderSimple },
  Add: { label: strings.tabs.Add, icon: PlusCircle },
  Photos: { label: strings.tabs.Photos, icon: ImageSquare },
  Settings: { label: strings.tabs.Settings, icon: Gear },
};

function BottomTabNavigator(props: BottomTabBarProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const items = props.state.routes
    .filter((route) => Object.keys(tabs).includes(route.name))
    .map((route, index) => {
      const { options } = props.descriptors[route.key];
      const label = tabs[route.name as keyof typeof tabs].label;
      const isFocused = props.state.index === index;
      const isAddRoute = route.name === 'Add';
      const isSettingsRoute = route.name === 'Settings';
      const onPress = () => {
        if (isSettingsRoute) {
          dispatch(storageThunks.loadStorageUsageThunk());
        }
        if (isAddRoute) {
          return dispatch(uiActions.setShowUploadFileModal(true));
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
      const iconColor = isAddRoute
        ? getColor('text-white')
        : isFocused
        ? getColor('text-primary')
        : getColor('text-neutral-80');
      const Icon = tabs[route.name as keyof typeof tabs].icon;

      return (
        <TouchableWithoutFeedback
          key={route.key}
          accessibilityRole="button"
          accessibilityState={isFocused ? { selected: true } : {}}
          accessibilityLabel={options.tabBarAccessibilityLabel}
          testID={options.tabBarTestID}
          onPress={onPress}
          onLongPress={onLongPress}
        >
          <View style={tailwind('h-14 items-center justify-center flex-1')}>
            {isAddRoute ? (
              <Icon weight="fill" color={getColor('text-primary')} size={40} />
            ) : (
              <Icon weight={isFocused ? 'fill' : undefined} color={iconColor} size={26} />
            )}

            {options.tabBarShowLabel && !isAddRoute && (
              <Text
                style={[
                  tailwind('text-supporting-2'),
                  isFocused ? tailwind('text-primary') : tailwind('text-neutral-80'),
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
