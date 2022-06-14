import React, { useState } from 'react';
import strings from '../../../assets/lang/strings';

import SearchInput from '../../components/SearchInput';
import ScreenTitle from '../../components/AppScreenTitle';
import Tabs from '../../components/Tabs';
import RecentsScreen from '../RecentsScreen';
import SharedScreen from '../SharedScreen';
import AppScreen from '../../components/AppScreen';
import { useTailwind } from 'tailwind-rn';

enum HomeTab {
  Recents = 'recents',
  Shared = 'shared',
}

const HomeScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const [searchText, setSearchText] = useState('');
  const [currentTab, setCurrentTab] = useState<HomeTab>(HomeTab.Recents);
  const searchPlaceholder = {
    [HomeTab.Recents]: strings.inputs.searchInRecents,
    [HomeTab.Shared]: strings.inputs.searchInShared,
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
    <AppScreen safeAreaTop style={tailwind('flex-1 flex-grow')}>
      <ScreenTitle text={strings.screens.home.title} showBackButton={false} />
      <SearchInput value={searchText} onChangeText={setSearchText} placeholder={searchPlaceholder} />
      <Tabs value={currentTab} onTabChanged={onTabChanged} tabs={tabs} />
    </AppScreen>
  );
};

export default HomeScreen;
