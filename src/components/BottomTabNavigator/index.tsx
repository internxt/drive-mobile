import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, TouchableWithoutFeedback, View } from 'react-native';

import { EnvelopeIcon, FolderSimpleIcon, GearIcon, HouseIcon, ImageIcon, UsersIcon } from 'phosphor-react-native';
import { storageThunks } from 'src/store/slices/storage';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectUnreadByMailbox } from '../../store/slices/mail/selectors';
import { paymentsSelectors } from '../../store/slices/payments';
import globalStyle from '../../styles/global';
import { MailboxId } from '../../types/mail';
import { TAB_BAR_HEIGHT } from '../FloatingActionButton/floatingButtonLayout';

const TAB_ICON_SIZE = 26;
const BADGE_SIZE = 16;
const BADGE_BORDER_WIDTH = 2;
const BADGE_OFFSET_FROM_CENTER = 8;
const BADGE_TOP_OFFSET = -2;
const MAX_BADGE_COUNT = 99;

function BottomTabNavigator(props: BottomTabBarProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const isHidden = useAppSelector((state) => state.ui.isTabBarHidden);
  const unreadInboxCount = useAppSelector(selectUnreadByMailbox)[MailboxId.Inbox] ?? 0;
  const hasMailAccess = useAppSelector(paymentsSelectors.hasMailAccess);
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
    Mail: { label: strings.tabs.Mail, icon: EnvelopeIcon },
    Shared: { label: strings.tabs.Shared, icon: UsersIcon },
    Photos: { label: strings.tabs.Photos, icon: ImageIcon },
    Settings: { label: strings.tabs.Settings, icon: GearIcon },
  };

  const onTabPress = (route: BottomTabBarProps['state']['routes'][number], isFocused: boolean) => {
    if (route.name === 'Settings') {
      dispatch(storageThunks.loadStorageUsageThunk());
    }
    const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      props.navigation.navigate(route.name);
    }
  };

  const onLongPressTab = (route: BottomTabBarProps['state']['routes'][number]) => {
    props.navigation.emit({ type: 'tabLongPress', target: route.key });
  };

  const renderUnreadBadge = () => (
    <View
      style={[
        tailwind('absolute items-center justify-center rounded-full px-1'),
        {
          top: BADGE_TOP_OFFSET,
          left: TAB_ICON_SIZE / 2 + BADGE_OFFSET_FROM_CENTER,
          minWidth: BADGE_SIZE,
          height: BADGE_SIZE,
          backgroundColor: getColor('text-red'),
          borderWidth: BADGE_BORDER_WIDTH,
          borderColor: getColor('bg-surface'),
        },
      ]}
    >
      <Text style={[tailwind('text-supporting-2'), globalStyle.fontWeight.semibold, { color: getColor('text-white') }]}>
        {unreadInboxCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : unreadInboxCount}
      </Text>
    </View>
  );

  const renderTab = (route: BottomTabBarProps['state']['routes'][number], isFocused: boolean) => {
    const { options } = props.descriptors[route.key];
    const { label, icon: Icon } = tabs[route.name as keyof typeof tabs];
    const color = isFocused ? getColor('text-primary') : getColor('text-gray-50');
    const hasUnreadBadge = route.name === 'Mail' && hasMailAccess && unreadInboxCount > 0;

    return (
      <TouchableWithoutFeedback
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarButtonTestID}
        onPress={() => onTabPress(route, isFocused)}
        onLongPress={() => onLongPressTab(route)}
      >
        <View style={tailwind('h-14 items-center justify-center flex-1')}>
          <View>
            <Icon weight={isFocused ? 'fill' : undefined} color={color} size={TAB_ICON_SIZE} />
            {hasUnreadBadge && renderUnreadBadge()}
          </View>

          {options.tabBarShowLabel && (
            <Text
              style={[
                tailwind('text-supporting-2'),
                { color },
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
    .map((route) => renderTab(route, props.state.routes[props.state.index]?.key === route.key));

  return (
    <View style={{ backgroundColor: getColor('bg-surface') }}>
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
