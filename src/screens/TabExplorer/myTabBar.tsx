import React from 'react';
import { View, TouchableWithoutFeedback, Text } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons'
import { layoutActions } from '../../redux/actions';
import { connect } from 'react-redux';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs/lib/typescript/src/types'
import { Reducers } from '../../redux/reducers/reducers';
import { getColor, tailwind } from '../../helpers/designSystem';
import globalStyle from '../../styles/global.style';

const tabIcons = {
  Drive: Unicons.UilHdd,
  Recents: Unicons.UilClock,
  Create: Unicons.UilPlusCircle,
  Shared: Unicons.UilLinkAdd,
  Settings: Unicons.UilSetting
}

interface MyTabBarProps extends Omit<Reducers, 'navigation'>, BottomTabBarProps {
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function MyTabBar(props: MyTabBarProps): JSX.Element {

  return (
    <View style={tailwind('bg-white flex-row px-2 justify-around items-center border-t border-neutral-20')}>
      {props.state.routes.map((route, index) => {
        const { options } = props.descriptors[route.key];

        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;

        const isFocused = props.state.index === index;

        const onPress = () => {

          if (route.name === 'Create') {
            return props.dispatch(layoutActions.openUploadFileModal());
          }

          const event = props.navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true
          });

          if (!isFocused && !event.defaultPrevented) {
            props.navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          props.navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        const Icon = tabIcons[route.name];

        return (
          // eslint-disable-next-line react/jsx-key
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
              <Icon color={isFocused ? getColor('blue-60') : getColor('neutral-80')} size={24} />
              {options.tabBarShowLabel && <Text style={[tailwind('text-supporting-2 mt-0.5'), isFocused ? tailwind('text-blue-60') : tailwind('text-neutral-80'), isFocused ? globalStyle.fontWeight.medium : globalStyle.fontWeight.regular]}>{label}</Text>}
            </View>
          </TouchableWithoutFeedback>
        );
      })}
    </View>
  );
}

const mapStateToProps = (state: any) => ({ ...state });

export default connect(mapStateToProps)(MyTabBar);
