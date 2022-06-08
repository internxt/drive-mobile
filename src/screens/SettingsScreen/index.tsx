import React from 'react';
import {
  GestureResponderEvent,
  Linking,
  Text,
  TouchableHighlight,
  View,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { CaretRight } from 'phosphor-react-native';

import { getColor, tailwind } from '../../helpers/designSystem';
import strings from '../../../assets/lang/strings';
import AppVersionWidget from '../../components/AppVersionWidget';
import { useAppSelector } from '../../store/hooks';
import { authSelectors } from '../../store/slices/auth';
import globalStyle from '../../styles';
import AppScreen from '../../components/AppScreen';
import appService from '../../services/AppService';
import AppText from '../../components/AppText';
import { TabExplorerScreenProps } from '../../types/navigation';
import AppScreenTitle from '../../components/AppScreenTitle';

interface SettingsGroupItemProps {
  key: string;
  template: JSX.Element;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
}

function SettingsGroup({ title, items }: { title: string; items: SettingsGroupItemProps[] }) {
  const SettingsGroupItem = (props: SettingsGroupItemProps) => {
    return (
      <TouchableHighlight
        underlayColor={getColor('neutral-30')}
        onPress={(event) => {
          if (props.onPress) {
            props.onPress(event);
          }
        }}
      >
        {props.template}
      </TouchableHighlight>
    );
  };
  const renderItems = () => items.map((i) => <SettingsGroupItem {...i} />);

  return (
    <View style={tailwind('mb-8')}>
      <AppText style={tailwind('text-xs ml-4 mb-2')} semibold>
        {title.toUpperCase()}
      </AppText>
      <View style={tailwind('bg-white rounded-xl')}>{renderItems()}</View>
    </View>
  );
}

function SettingsScreen({ navigation }: TabExplorerScreenProps<'Settings'>): JSX.Element {
  const { user } = useAppSelector((state) => state.auth);
  const userNameLetters = useAppSelector(authSelectors.nameLetters);
  const userFullName = useAppSelector(authSelectors.userFullName);
  const onAccountPressed = () => {
    navigation.push('Account');
  };
  const onStoragePressed = () => {
    navigation.push('Storage');
  };
  const onLanguagePressed = () => undefined;
  const onSupportPressed = () => {
    Linking.openURL('mailto:hello@internxt.com');
  };
  const onMoreInfoPressed = () => {
    Linking.openURL('https://internxt.com');
  };
  const onTermsAndConditionsPressed = () => {
    Linking.openURL('https://internxt.com/legal');
  };
  const onDebugPressed = () => {
    navigation.push('Debug');
  };

  return (
    <AppScreen safeAreaTop backgroundColor={getColor('white')} style={tailwind('min-h-full')}>
      <ScrollView>
        <AppScreenTitle
          text={strings.screens.SettingsScreen.title}
          showBackButton={false}
          rightSlot={
            <View style={tailwind('flex-grow items-end justify-center')}>
              <AppVersionWidget />
            </View>
          }
          containerStyle={tailwind('mb-4')}
        />
        <View style={tailwind('px-4 pt-8 flex-grow bg-neutral-30')}>
          {/* ACCOUNT */}
          <SettingsGroup
            title={'Account'}
            items={[
              {
                key: 'account',
                template: (
                  <View style={tailwind('items-center flex-row p-4')}>
                    <View style={tailwind('bg-blue-20 items-center justify-center rounded-3xl w-10 h-10')}>
                      <AppText semibold style={tailwind('text-blue-80 font-bold text-xl')}>
                        {userNameLetters}
                      </AppText>
                    </View>

                    <View style={tailwind('ml-3')}>
                      <Text
                        style={{
                          ...tailwind('text-xl text-neutral-500 font-semibold'),
                          ...globalStyle.fontWeight.semibold,
                        }}
                      >
                        {userFullName}
                      </Text>
                      <Text style={tailwind('text-neutral-100')}>{user?.email}</Text>
                    </View>
                  </View>
                ),
                onPress: onAccountPressed,
              },
            ]}
          />

          {/* GENERAL */}
          <SettingsGroup
            title={'General'}
            items={[
              {
                key: 'storage',
                template: (
                  <View style={[tailwind('flex-row px-4 py-3')]}>
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-neutral-500')]}>
                        {strings.screens.SettingsScreen.storage}
                      </AppText>
                    </View>
                    <View style={tailwind('justify-center')}>
                      <CaretRight color={getColor('neutral-60')} />
                    </View>
                  </View>
                ),
                onPress: onStoragePressed,
              },
              {
                key: 'language',
                template: (
                  <View style={[tailwind('flex-row px-4 py-3')]}>
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-neutral-500')]}>
                        {strings.screens.SettingsScreen.language}
                      </AppText>
                    </View>
                    <View style={tailwind('justify-center')}>
                      <CaretRight color={getColor('neutral-60')} />
                    </View>
                  </View>
                ),
                onPress: onLanguagePressed,
              },
            ]}
          />
          {/* PHOTOS GALLERY */}
          <SettingsGroup
            title={'Photos Gallery'}
            items={[
              {
                key: 'photos-mobile-data',
                template: <View style={[tailwind('flex-row px-4 py-3')]}></View>,
              },
            ]}
          />
          {/* INFORMATION */}
          <SettingsGroup
            title={'Information'}
            items={[
              {
                key: 'support',
                template: (
                  <View style={[tailwind('flex-row px-4 py-3')]}>
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-neutral-500')]}>
                        {strings.screens.SettingsScreen.support}
                      </AppText>
                    </View>
                    <View style={tailwind('justify-center')}>
                      <CaretRight color={getColor('neutral-60')} />
                    </View>
                  </View>
                ),
                onPress: onSupportPressed,
              },
              {
                key: 'more-information',
                template: (
                  <View style={[tailwind('flex-row px-4 py-3')]}>
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-neutral-500')]}>
                        {strings.screens.SettingsScreen.more}
                      </AppText>
                    </View>
                    <View style={tailwind('justify-center')}>
                      <CaretRight color={getColor('neutral-60')} />
                    </View>
                  </View>
                ),
                onPress: onMoreInfoPressed,
              },
            ]}
          />
          {/* LEGAL */}
          <SettingsGroup
            title={'Legal'}
            items={[
              {
                key: 'terms-and-conditions',
                template: (
                  <View style={[tailwind('flex-row px-4 py-3')]}>
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-neutral-500')]}>
                        {strings.screens.SettingsScreen.termsAndConditions}
                      </AppText>
                    </View>
                    <View style={tailwind('justify-center')}>
                      <CaretRight color={getColor('neutral-60')} />
                    </View>
                  </View>
                ),
                onPress: onTermsAndConditionsPressed,
              },
            ]}
          />

          {/* DEBUG */}
          {appService.constants.REACT_NATIVE_DEBUG && (
            <SettingsGroup
              title={'Debug'}
              items={[
                {
                  key: 'terms-and-conditions',
                  template: (
                    <View style={[tailwind('flex-row px-4 py-3')]}>
                      <View style={tailwind('flex-grow justify-center')}>
                        <AppText style={[tailwind('text-lg text-neutral-500')]}>
                          {strings.screens.DebugScreen.title}
                        </AppText>
                      </View>
                      <View style={tailwind('justify-center')}>
                        <CaretRight color={getColor('neutral-60')} />
                      </View>
                    </View>
                  ),
                  onPress: onDebugPressed,
                },
              ]}
            />
          )}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export default SettingsScreen;
