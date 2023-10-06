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
import errorService from '../../services/ErrorService';
import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
enum HomeTab {
  Recents = 'recents',
  Shared = 'shared',
}

const HomeScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const [searchText, setSearchText] = useState('');
  const [sharedItemsPage, setSharedItemsPage] = useState(1);
  const [shouldGetMoreSharedFiles, setShouldGetMoreSharedFiles] = useState(true);
  const [shouldGetMoreSharedFolders, setShouldGetMoreSharedFolders] = useState(true);
  const [gettingSharedItems, setGettingSharedItems] = useState(false);
  const [sharedItems, setSharedItems] = useState<(SharedFiles & SharedFolders)[]>([]);

  const {
    data: recentItems,
    loading: recentsLoading,
    executeUseCase: refreshRecentItems,
  } = useUseCase(useCases.loadRecentItems);
  const { loading: sharedLoading, executeUseCase: getSharedItems } = useUseCase(useCases.getSharedItems);

  useEffect(() => {
    const unsubscribeUploaded = useCases.onDriveItemUploaded(refreshRecentItems);
    const unsubscribeTrashed = useCases.onDriveItemTrashed(refreshRecentItems);
    return () => {
      unsubscribeUploaded();
      unsubscribeTrashed();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = useCases.onDriveItemTrashed(async () => {
      refreshRecentItems();
      handleSharedLinksRefresh();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    handleSharedLinksRefresh();
    const unsubscribe = useCases.onSharedLinksUpdated(getSharedItems);

    return unsubscribe;
  }, []);

  const handleSharedLinksRefresh = async () => {
    try {
      setGettingSharedItems(true);
      setShouldGetMoreSharedFiles(true);
      setShouldGetMoreSharedFolders(true);
      const result = await getSharedItems({ page: 0, shouldGetFiles: true, shouldGetFolders: true });
      if (!result?.data?.items.length) return;

      if (!result.data.hasMoreFiles) {
        setShouldGetMoreSharedFiles(false);
      }

      if (!result.data.hasMoreFolders) {
        setShouldGetMoreSharedFolders(false);
      }
      setSharedItems(result.data.items);
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setGettingSharedItems(false);
    }
  };

  const handleNextSharedItemsPage = async () => {
    try {
      setSharedItemsPage(sharedItemsPage + 1);
      const result = await getSharedItems({
        page: sharedItemsPage + 1,
        shouldGetFiles: shouldGetMoreSharedFiles,
        shouldGetFolders: shouldGetMoreSharedFolders,
      });

      if (!result?.data?.hasMoreFiles) {
        setShouldGetMoreSharedFiles(false);
      }

      if (!result?.data?.hasMoreFolders) {
        setShouldGetMoreSharedFolders(false);
      }

      if (!result?.data?.items.length) return;

      setSharedItems(sharedItems.concat(result.data.items));
    } catch (error) {
      errorService.reportError(error);
    }
  };

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
          isLoading={gettingSharedItems}
          sharedLinks={sharedItems as unknown as []}
          refreshSharedLinks={handleSharedLinksRefresh}
          onEndOfListReached={handleNextSharedItemsPage}
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
