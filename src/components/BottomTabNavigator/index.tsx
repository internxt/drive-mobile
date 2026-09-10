import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import {
  EnvelopeIcon,
  FolderSimpleIcon,
  GearIcon,
  HouseIcon,
  ImageIcon,
  NotePencilIcon,
  PlusCircleIcon,
  UsersIcon,
} from 'phosphor-react-native';
import { storageThunks } from 'src/store/slices/storage';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import globalStyle from '../../styles/global';
import { RootScreenNavigationProp } from '../../types/navigation';

const TAB_BAR_HEIGHT = 56;

const DRIVE_ONLY_TABS = new Set(['Home', 'Drive', 'Add', 'Photos']);

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

  const renderSpaceSwitcherOption = (space: 'drive' | 'mail') => {
    const isActive = activeSpace === space;
    const Icon = space === 'drive' ? FolderSimpleIcon : EnvelopeIcon;
    const label = space === 'drive' ? strings.tabs.Drive : strings.tabs.Mail;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          tailwind('flex-1 flex-row items-center justify-center rounded-full py-2'),
          isActive && {
            backgroundColor: getColor('bg-surface'),
            shadowColor: getColor('text-gray-100'),
            shadowOpacity: 0.08,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          },
        ]}
        onPress={() => onDriveOrMailSpaceSelected(space)}
      >
        <Icon
          weight={isActive ? 'fill' : undefined}
          color={isActive ? getColor('text-primary') : getColor('text-gray-50')}
          size={18}
        />
        <Text
          style={[
            tailwind('ml-2 text-sm'),
            { color: isActive ? getColor('text-primary') : getColor('text-gray-50') },
            isActive ? globalStyle.fontWeight.medium : globalStyle.fontWeight.regular,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
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
      {driveRoute && !isHidden && (
        <View style={tailwind('px-4 pt-2 pb-1')}>
          <View style={[tailwind('flex-row rounded-full'), { padding: 4, backgroundColor: getColor('bg-gray-5') }]}>
            {renderSpaceSwitcherOption('drive')}
            {renderSpaceSwitcherOption('mail')}
          </View>
        </View>
      )}

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
