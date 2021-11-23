import _ from 'lodash';
import React, { useState } from 'react';
import { View } from 'react-native';
import strings from '../../../assets/lang/strings';

import SkinSkeleton from '../../components/SkinSkeleton';
import SearchInput from '../../components/SearchInput';
import ScreenTitle from '../../components/ScreenTitle';
import { tailwind } from '../../helpers/designSystem';

enum HomeTab {
  Recents = 'recents',
  Shared = 'shared',
}

const HomeScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentTab, setCurrentTab] = useState<HomeTab>(HomeTab.Recents);
  const searchPlaceholder = {
    [HomeTab.Recents]: strings.components.inputs.searchInRecents,
    [HomeTab.Shared]: strings.components.inputs.searchInShared,
  }[currentTab];

  return (
    <View style={tailwind('app-screen bg-white flex-1')}>
      <ScreenTitle text={strings.screens.home.title} showBackButton={false} />
      <SearchInput value={searchText} onChangeText={setSearchText} placeholder={searchPlaceholder} />
      {isLoading && (
        <View>
          {_.times(20, (n) => (
            <SkinSkeleton key={n} />
          ))}
        </View>
      )}
    </View>
  );
};

export default HomeScreen;
