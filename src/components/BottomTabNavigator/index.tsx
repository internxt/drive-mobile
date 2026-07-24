import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';
import { Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import {
  EnvelopeIcon,
  FolderSimpleIcon,
  GearIcon,
  HouseIcon,
  NotePencilIcon,
  PlusCircleIcon,
  UsersIcon,
} from 'phosphor-react-native';
import { storageThunks } from 'src/store/slices/storage';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';
import { useLanguage } from '../../hooks/useLanguage';
import { RootScreenNavigationProp } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import globalStyle from '../../styles/global';

function BottomTabNavigator(props: BottomTabBarProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const activeSpace = useAppSelector((state) => state.ui.activeSpace);
  useLanguage();

  const tabs = {
    Home: { label: strings.tabs.Home, icon: HouseIcon },
    Add: { label: strings.tabs.Add, icon: PlusCircleIcon },
    Settings: { label: strings.tabs.Settings, icon: GearIcon },
  };

  const driveRoute = props.state.routes.find((route) => route.name === 'Drive');

  const onDriveOrMailSpaceSelected = (space: 'drive' | 'mail') => {
    if (!driveRoute) return;
    dispatch(uiActions.setActiveSpace(space));
    if (props.state.routes[props.state.index].key !== driveRoute.key) {
      props.navigation.navigate(driveRoute.name);
    }
  };

  const onSharedOrComposePressed = (sharedRoute: BottomTabBarProps['state']['routes'][number]) => {
    if (activeSpace === 'mail') {
      props.navigation.getParent<RootScreenNavigationProp<'TabExplorer'>>()?.navigate('ComposeEmail');
      return;
    }
    const event = props.navigation.emit({ type: 'tabPress', target: sharedRoute.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      props.navigation.navigate(sharedRoute.name);
    }
  };

  const renderSharedTab = (route: BottomTabBarProps['state']['routes'][number], isFocused: boolean) => {
    const { options } = props.descriptors[route.key];
    const SharedIcon = activeSpace === 'mail' ? NotePencilIcon : UsersIcon;
    const sharedLabel = activeSpace === 'mail' ? strings.tabs.NewEmail : strings.tabs.Shared;
    return (
      <TouchableWithoutFeedback
        key={route.key}
        accessibilityRole="button"
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={() => onSharedOrComposePressed(route)}
      >
        <View style={tailwind('h-14 items-center justify-center flex-1')}>
          <SharedIcon
            weight={isFocused ? 'fill' : undefined}
            color={isFocused ? getColor('text-primary') : getColor('text-gray-50')}
            size={26}
          />
          <Text
            style={[
              tailwind('text-supporting-2'),
              { color: isFocused ? getColor('text-primary') : getColor('text-gray-50') },
              isFocused ? globalStyle.fontWeight.medium : globalStyle.fontWeight.regular,
            ]}
          >
            {sharedLabel}
          </Text>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const onRegularTabPress = (route: BottomTabBarProps['state']['routes'][number], isFocused: boolean) => {
    const isSettingsRoute = route.name === 'Settings';
    const isAddRoute = route.name === 'Add';

    if (isSettingsRoute) {
      dispatch(storageThunks.loadStorageUsageThunk());
    }
    if (isAddRoute) {
      dispatch(uiActions.setShowUploadFileModal(true));
      return;
    }
    const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      props.navigation.navigate(route.name);
    }
  };

  const onLongPressTab = (route: BottomTabBarProps['state']['routes'][number]) => {
    props.navigation.emit({ type: 'tabLongPress', target: route.key });
  };

  const getTabIconColor = (isAddRoute: boolean, isFocused: boolean) => {
    if (isAddRoute) return getColor('text-white');
    return isFocused ? getColor('text-primary') : getColor('text-gray-50');
  };

  const renderRegularTab = (route: BottomTabBarProps['state']['routes'][number], isFocused: boolean) => {
    const { options } = props.descriptors[route.key];
    const isAddRoute = route.name === 'Add';
    const label = tabs[route.name as keyof typeof tabs].label;
    const Icon = tabs[route.name as keyof typeof tabs].icon;
    const iconColor = getTabIconColor(isAddRoute, isFocused);

    return (
      <TouchableWithoutFeedback
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={() => onRegularTabPress(route, isFocused)}
        onLongPress={() => onLongPressTab(route)}
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
  };

  const items = props.state.routes
    .filter((route) => Object.keys(tabs).includes(route.name) || route.name === 'Shared')
    .filter((route) => !(activeSpace === 'mail' && (route.name === 'Home' || route.name === 'Add')))
    .map((route) => {
      const isFocused = props.state.routes[props.state.index]?.key === route.key;
      return route.name === 'Shared' ? renderSharedTab(route, isFocused) : renderRegularTab(route, isFocused);
    });

  return (
    <View style={{ backgroundColor: getColor('bg-surface') }}>
      {driveRoute && (
        <View style={tailwind('px-4 pt-2 pb-1')}>
          <View style={[tailwind('flex-row rounded-full'), { padding: 4, backgroundColor: getColor('bg-gray-5') }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                tailwind('flex-1 flex-row items-center justify-center rounded-full py-2'),
                activeSpace === 'drive' && {
                  backgroundColor: getColor('bg-surface'),
                  shadowColor: getColor('text-gray-100'),
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 1,
                },
              ]}
              onPress={() => onDriveOrMailSpaceSelected('drive')}
            >
              <FolderSimpleIcon
                weight={activeSpace === 'drive' ? 'fill' : undefined}
                color={activeSpace === 'drive' ? getColor('text-primary') : getColor('text-gray-50')}
                size={18}
              />
              <Text
                style={[
                  tailwind('ml-2 text-sm'),
                  { color: activeSpace === 'drive' ? getColor('text-primary') : getColor('text-gray-50') },
                  activeSpace === 'drive' ? globalStyle.fontWeight.medium : globalStyle.fontWeight.regular,
                ]}
              >
                {strings.tabs.Drive}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                tailwind('flex-1 flex-row items-center justify-center rounded-full py-2'),
                activeSpace === 'mail' && {
                  backgroundColor: getColor('bg-surface'),
                  shadowColor: getColor('text-gray-100'),
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 1,
                },
              ]}
              onPress={() => onDriveOrMailSpaceSelected('mail')}
            >
              <EnvelopeIcon
                weight={activeSpace === 'mail' ? 'fill' : undefined}
                color={activeSpace === 'mail' ? getColor('text-primary') : getColor('text-gray-50')}
                size={18}
              />
              <Text
                style={[
                  tailwind('ml-2 text-sm'),
                  { color: activeSpace === 'mail' ? getColor('text-primary') : getColor('text-gray-50') },
                  activeSpace === 'mail' ? globalStyle.fontWeight.medium : globalStyle.fontWeight.regular,
                ]}
              >
                {strings.tabs.Mail}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View
        style={[
          tailwind('flex-row px-2 justify-around items-center'),
          {
            borderTopWidth: 1,
            borderTopColor: getColor('border-gray-10'),
          },
        ]}
      >
        {items}
      </View>
    </View>
  );
}

export default BottomTabNavigator;
