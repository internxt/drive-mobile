import React, { useEffect, useState } from 'react';
import strings from '../../../assets/lang/strings';

import ScreenTitle from '../../components/AppScreenTitle';
import Tabs from '../../components/Tabs';
import { RecentsScreen } from '../drive/RecentsScreen';
import { SharedScreen } from '../drive/SharedScreen';
import AppScreen from '../../components/AppScreen';
import { useTailwind } from 'tailwind-rn';
import { useUseCase } from '@internxt-mobile/hooks/common';
import * as useCases from '@internxt-mobile/useCases/drive';
import { SearchInput } from 'src/components/SearchInput';
enum HomeTab {
  Recents = 'recents',
  Shared = 'shared',
}

const HomeScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const [searchText, setSearchText] = useState('');
  const {
    data: recentItems,
    loading: recentsLoading,
    executeUseCase: refreshRecentItems,
  } = useUseCase(useCases.loadRecentItems);
  const {
    data: sharedLinks,
    loading: sharedLoading,
    executeUseCase: refreshSharedLinks,
  } = useUseCase(useCases.loadSharedLinks);

  useEffect(() => {
    const unsubscribe = useCases.onDriveItemUploaded(refreshRecentItems);

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = useCases.onDriveItemDeleted(async () => {
      refreshRecentItems();
      refreshSharedLinks();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = useCases.onSharedLinksUpdated(refreshSharedLinks);

    return unsubscribe;
  }, []);
  const [currentTab, setCurrentTab] = useState<HomeTab>(HomeTab.Recents);
  const searchPlaceholder = {
    [HomeTab.Recents]: strings.inputs.searchInRecents,
    [HomeTab.Shared]: strings.inputs.searchInShared,
  }[currentTab];
  const tabs = [
    {
      id: HomeTab.Recents,
      title: strings.screens.recents.title,
      screen: (
        <RecentsScreen
          searchText={searchText}
          isLoading={recentsLoading}
          recentItems={recentItems}
          refreshRecentItems={() => refreshRecentItems()}
        ></RecentsScreen>
      ),
    },
    {
      id: HomeTab.Shared,
      title: strings.screens.shared.title,
      screen: (
        <SharedScreen
          searchText={searchText}
          isLoading={sharedLoading}
          sharedLinks={sharedLinks}
          refreshSharedLinks={() => refreshSharedLinks()}
        ></SharedScreen>
      ),
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
