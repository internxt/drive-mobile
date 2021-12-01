import React, { useState } from 'react';
import { View } from 'react-native';
import strings from '../../../assets/lang/strings';

import SearchInput from '../../components/SearchInput';
import ScreenTitle from '../../components/ScreenTitle';
import { tailwind } from '../../helpers/designSystem';
import Tabs from '../../components/Tabs';
import RecentsScreen from '../RecentsScreen';
import SharedScreen from '../SharedScreen';

enum HomeTab {
  Recents = 'recents',
  Shared = 'shared',
}

const HomeScreen = (): JSX.Element => {
  const [searchText, setSearchText] = useState('');
  const [currentTab, setCurrentTab] = useState<HomeTab>(HomeTab.Recents);
  const searchPlaceholder = {
    [HomeTab.Recents]: strings.components.inputs.searchInRecents,
    [HomeTab.Shared]: strings.components.inputs.searchInShared,
  }[currentTab];
  const tabs = [
    {
      id: HomeTab.Recents,
      title: strings.screens.recents.title,
      screen: <RecentsScreen searchText={searchText}></RecentsScreen>,
    },
    {
      id: HomeTab.Shared,
      title: strings.screens.shared.title,
      screen: <SharedScreen searchText={searchText}></SharedScreen>,
    },
  ];
  const onTabChanged = (tabId: string) => {
    setCurrentTab(tabId as HomeTab);

    setSearchText('');
  };

  return (
    <View style={tailwind('app-screen bg-white flex-1')}>
      <ScreenTitle text={strings.screens.home.title} showBackButton={false} />
      <SearchInput value={searchText} onChangeText={setSearchText} placeholder={searchPlaceholder} />
      <Tabs value={currentTab} onTabChanged={onTabChanged} tabs={tabs} />
    </View>
  );
};

export default HomeScreen;
