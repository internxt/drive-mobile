import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';
import { Text, TouchableWithoutFeedback, View } from 'react-native';

import { FolderSimple, Gear, House, PlusCircle, Users } from 'phosphor-react-native';
import { storageThunks } from 'src/store/slices/storage';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppDispatch } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import globalStyle from '../../styles/global';

function BottomTabNavigator(props: BottomTabBarProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  useLanguage();

  const tabs = {
    Home: { label: strings.tabs.Home, icon: House },
    Drive: { label: strings.tabs.Drive, icon: FolderSimple },
    Add: { label: strings.tabs.Add, icon: PlusCircle },
    Shared: { label: strings.tabs.Shared, icon: Users },
    Settings: { label: strings.tabs.Settings, icon: Gear },
  };

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
        : getColor('text-gray-50');

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
                  { color: isFocused ? getColor('text-primary') : getColor('text-gray-50') },
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
    <View
      style={[
        tailwind('flex-row px-2 justify-around items-center'),
        {
          backgroundColor: getColor('bg-surface'),
          borderTopWidth: 1,
          borderTopColor: getColor('border-gray-10'),
        },
      ]}
    >
      {items}
    </View>
  );
}

export default BottomTabNavigator;
