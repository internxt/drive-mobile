import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, TouchableWithoutFeedback, View } from 'react-native';

import {
  FolderSimpleIcon,
  GearIcon,
  HouseIcon,
  ImageIcon,
  NotePencilIcon,
  PlusCircleIcon,
  UsersIcon,
} from 'phosphor-react-native';
import { logger } from '@internxt-mobile/services/common';
import { storageThunks } from 'src/store/slices/storage';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ActiveSpace, uiActions } from '../../store/slices/ui';
import globalStyle from '../../styles/global';
import SpaceSwitcher from '../SpaceSwitcher';
import { RootScreenNavigationProp } from '../../types/navigation';

const TAB_BAR_HEIGHT = 56;

const DRIVE_ONLY_TABS = new Set(['Home', 'Drive', 'Add', 'Photos']);

const MAIL_ROUTE = 'Mail';
const DRIVE_ROUTE = 'Drive';

const spaceForRoute = (routeName: string): ActiveSpace => (routeName === MAIL_ROUTE ? 'mail' : 'drive');

function BottomTabNavigator(props: BottomTabBarProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const activeSpace = useAppSelector((state) => state.ui.activeSpace);
  const isHidden = useAppSelector((state) => state.ui.isTabBarHidden);
  useLanguage();

  const heightAnim = useRef(new Animated.Value(isHidden ? 0 : TAB_BAR_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isHidden ? 0 : TAB_BAR_HEIGHT,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isHidden]);

  const tabs = {
    Home: { label: strings.tabs.Home, icon: HouseIcon },
    Drive: { label: strings.tabs.Drive, icon: FolderSimpleIcon },
    Add: { label: strings.tabs.Add, icon: PlusCircleIcon },
    Shared: { label: strings.tabs.Shared, icon: UsersIcon },
    Photos: { label: strings.tabs.Photos, icon: ImageIcon },
    Settings: { label: strings.tabs.Settings, icon: GearIcon },
  };

  const focusedRouteName = props.state.routes[props.state.index]?.name;

  useEffect(() => {
    const spaceOnScreen = spaceForRoute(focusedRouteName);
    if (spaceOnScreen !== activeSpace) {
      dispatch(uiActions.setActiveSpace(spaceOnScreen));
    }
  }, [focusedRouteName, activeSpace, dispatch]);

  const driveRoute = props.state.routes.find((route) => route.name === DRIVE_ROUTE);

  const onDriveOrMailSpaceSelected = (space: ActiveSpace) => {
    const targetRouteName = space === 'mail' ? MAIL_ROUTE : DRIVE_ROUTE;
    const targetRoute = props.state.routes.find((route) => route.name === targetRouteName);
    if (!targetRoute) {
      logger.error(`No tab route named ${targetRouteName}; available: ${props.state.routes.map((r) => r.name)}`);
      return;
    }
    dispatch(uiActions.setActiveSpace(space));
    if (props.state.routes[props.state.index].key !== targetRoute.key) {
      props.navigation.navigate(targetRoute.name);
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
        testID={options.tabBarButtonTestID}
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
        testID={options.tabBarButtonTestID}
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
    .filter((route) => Object.keys(tabs).includes(route.name))
    .filter((route) => !(activeSpace === 'mail' && DRIVE_ONLY_TABS.has(route.name)))
    .map((route) => {
      const isFocused = props.state.routes[props.state.index]?.key === route.key;
      return route.name === 'Shared' ? renderSharedTab(route, isFocused) : renderRegularTab(route, isFocused);
    });

  return (
    <View style={{ backgroundColor: getColor('bg-surface') }}>
      {driveRoute && !isHidden && <SpaceSwitcher onSelectSpace={onDriveOrMailSpaceSelected} />}

      <Animated.View style={{ height: heightAnim, overflow: 'hidden' }}>
        <View
          style={[
            tailwind('flex-row px-2 justify-around items-center'),
            {
              height: TAB_BAR_HEIGHT,
              backgroundColor: getColor('bg-surface'),
              borderTopWidth: 1,
              borderTopColor: getColor('border-gray-10'),
            },
          ]}
        >
          {items}
        </View>
      </Animated.View>
    </View>
  );
}

export default BottomTabNavigator;
