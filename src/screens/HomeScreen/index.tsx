import { useState } from 'react';
import strings from '../../../assets/lang/strings';

import ScreenTitle from '../../components/AppScreenTitle';
import Tabs from '../../components/Tabs';
import { RecentsScreen } from '../drive/RecentsScreen';

import AppScreen from '../../components/AppScreen';
import { useTailwind } from 'tailwind-rn';
import { useUseCase } from '@internxt-mobile/hooks/common';
import * as useCases from '@internxt-mobile/useCases/drive';
import { SearchInput } from 'src/components/SearchInput';
import { useLanguage } from '../../hooks/useLanguage';
import { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { TabExplorerScreenProps } from '../../types/navigation';
import UserProfilePicture from '../../components/UserProfilePicture';
import { useProfileAvatar } from '../../hooks/useProfileAvatar';

enum HomeTab {
  Recents = 'recents',
}

const HomeScreen = (props: TabExplorerScreenProps<'Home'>): JSX.Element => {
  const tailwind = useTailwind();
  const profileAvatar = useProfileAvatar();
  useLanguage();
  const [searchText, setSearchText] = useState('');

  const {
    data: recentItems,
    loading: recentsLoading,
    executeUseCase: refreshRecentItems,
  } = useUseCase(useCases.loadRecentItems);

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
    });

    return unsubscribe;
  }, []);

  const [currentTab, setCurrentTab] = useState<HomeTab>(HomeTab.Recents);
  const searchPlaceholder = {
    [HomeTab.Recents]: strings.inputs.searchInRecents,
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
  ];
  const onTabChanged = (tabId: string) => {
    setCurrentTab(tabId as HomeTab);
    setSearchText('');
  };

  const avatarSlot = (
    <TouchableOpacity onPress={() => props.navigation.navigate('Settings')}>
      <UserProfilePicture uri={profileAvatar} size={36} />
    </TouchableOpacity>
  );

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1 flex-grow')}>
      <ScreenTitle text={strings.screens.home.title} showBackButton={false} rightSlot={avatarSlot} />
      <SearchInput value={searchText} onChangeText={setSearchText} placeholder={searchPlaceholder} />
      <Tabs value={currentTab} onTabChanged={onTabChanged} tabs={tabs} />
    </AppScreen>
  );
};

export default HomeScreen;
